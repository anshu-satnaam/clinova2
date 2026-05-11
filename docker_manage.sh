#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  Clinova Docker Manager — docker_manage.sh
#  Usage: ./docker_manage.sh [start|stop|restart|logs|status|build|clean]
# ════════════════════════════════════════════════════════════════

set -e

COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="clinova"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_header() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}${BOLD}║   CLINOVA Healthcare AI Platform — Docker    ║${NC}"
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
  echo ""
}

check_docker() {
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed.${NC}"
    echo ""
    echo -e "${YELLOW}Install Docker Desktop for Mac:${NC}"
    echo "  1. Open: https://www.docker.com/products/docker-desktop/"
    echo "  2. Download 'Docker Desktop for Mac (Apple Silicon)' or 'Intel Chip'"
    echo "  3. Open the .dmg file and drag Docker to Applications"
    echo "  4. Launch Docker Desktop and wait for it to start"
    echo "  5. Run this script again"
    echo ""
    exit 1
  fi

  if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker Desktop is not running.${NC}"
    echo -e "${YELLOW}Please open Docker Desktop and wait for it to start, then try again.${NC}"
    exit 1
  fi

  echo -e "${GREEN}✅ Docker is running ($(docker --version | cut -d' ' -f3 | tr -d ','))${NC}"
}

check_env() {
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and fill in your API keys before starting.${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ .env file found${NC}"
}

case "${1:-start}" in

  start)
    print_header
    check_docker
    check_env
    echo -e "${CYAN}🚀 Starting all Clinova services...${NC}"
    echo ""
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE up -d
    echo ""
    echo -e "${GREEN}${BOLD}✅ All services started!${NC}"
    echo ""
    echo -e "${BOLD}Service URLs:${NC}"
    echo -e "  🌐 Frontend:     ${CYAN}http://localhost:3001${NC}"
    echo -e "  🔌 API Gateway:  ${CYAN}http://localhost:3000${NC}"
    echo -e "  🤖 AI Service:   ${CYAN}http://localhost:8001/docs${NC}"
    echo -e "  🏥 FHIR Service: ${CYAN}http://localhost:8002/docs${NC}"
    echo -e "  🎙 Voice:        ${CYAN}http://localhost:8003/docs${NC}"
    echo -e "  📋 Audit:        ${CYAN}http://localhost:8004/docs${NC}"
    echo -e "  🔍 ChromaDB:     ${CYAN}http://localhost:8005${NC}"
    echo ""
    echo -e "${YELLOW}💡 Demo login: dr.smith@clinova.com / Clinova@123${NC}"
    ;;

  build)
    print_header
    check_docker
    check_env
    echo -e "${CYAN}🔨 Building all Docker images (this takes 3-5 minutes)...${NC}"
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE build --no-cache
    echo -e "${GREEN}✅ All images built successfully!${NC}"
    ;;

  stop)
    print_header
    check_docker
    echo -e "${YELLOW}⏹ Stopping all services...${NC}"
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE down
    echo -e "${GREEN}✅ All services stopped.${NC}"
    ;;

  restart)
    print_header
    check_docker
    echo -e "${YELLOW}🔄 Restarting all services...${NC}"
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE down
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE up -d
    echo -e "${GREEN}✅ All services restarted.${NC}"
    ;;

  logs)
    check_docker
    SERVICE="${2:-}"
    if [ -n "$SERVICE" ]; then
      echo -e "${CYAN}📋 Logs for ${SERVICE}:${NC}"
      docker compose -p $PROJECT_NAME -f $COMPOSE_FILE logs -f "$SERVICE"
    else
      echo -e "${CYAN}📋 Streaming all service logs (Ctrl+C to stop):${NC}"
      docker compose -p $PROJECT_NAME -f $COMPOSE_FILE logs -f
    fi
    ;;

  status)
    print_header
    check_docker
    echo -e "${CYAN}📊 Service Status:${NC}"
    echo ""
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE ps
    echo ""
    echo -e "${CYAN}🔍 Health Checks:${NC}"
    for service in clinova-gateway clinova-ai clinova-fhir clinova-voice clinova-audit clinova-chromadb clinova-frontend; do
      STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null || echo "not running")
      if [ "$STATUS" = "healthy" ]; then
        echo -e "  ${GREEN}✅ $service: healthy${NC}"
      elif [ "$STATUS" = "not running" ]; then
        echo -e "  ${RED}❌ $service: not running${NC}"
      else
        echo -e "  ${YELLOW}⏳ $service: $STATUS${NC}"
      fi
    done
    ;;

  clean)
    print_header
    check_docker
    echo -e "${RED}⚠️  This will remove all containers and the ChromaDB volume.${NC}"
    read -p "Are you sure? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
      docker compose -p $PROJECT_NAME -f $COMPOSE_FILE down -v --remove-orphans
      docker image prune -f
      echo -e "${GREEN}✅ All containers and volumes removed.${NC}"
    else
      echo "Cancelled."
    fi
    ;;

  db-migrate)
    check_docker
    echo -e "${CYAN}🗄 Running Prisma database migration...${NC}"
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE exec gateway-service npx prisma db push
    echo -e "${GREEN}✅ Database migration complete.${NC}"
    ;;

  *)
    echo "Usage: $0 {start|build|stop|restart|logs [service]|status|clean|db-migrate}"
    echo ""
    echo "  start       — Start all services in background"
    echo "  build       — Rebuild all Docker images"
    echo "  stop        — Stop all services"
    echo "  restart     — Restart all services"
    echo "  logs [svc]  — Stream logs (optionally for one service)"
    echo "  status      — Show container health status"
    echo "  clean       — Remove all containers and volumes"
    echo "  db-migrate  — Run Prisma schema push inside gateway container"
    exit 1
    ;;
esac
