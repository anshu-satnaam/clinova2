import os
import subprocess
import time

services = [
    {"name": "ChromaDB", "port": 8005, "dir": "backend/ai-service", "cmd": "./venv/bin/chroma run --host localhost --port 8005 --path ./chroma_db"},
    {"name": "Audit", "port": 8004, "dir": "backend/audit-service", "cmd": "source venv/bin/activate && python main.py"},
    {"name": "Voice", "port": 8003, "dir": "backend/voice-service", "cmd": "source venv/bin/activate && python main.py"},
    {"name": "FHIR", "port": 8002, "dir": "backend/fhir-service", "cmd": "source venv/bin/activate && python main.py"},
    {"name": "AI", "port": 8001, "dir": "backend/ai-service", "cmd": "source venv/bin/activate && python main.py"},
    {"name": "Gateway", "port": 3000, "dir": "backend/gateway-service", "cmd": "npm run start:dev"},
]

def kill_port(port):
    print(f"Killing port {port}...")
    subprocess.run(f"lsof -ti:{port} | xargs kill -9", shell=True, stderr=subprocess.DEVNULL)

def start_service(service):
    print(f"Starting {service['name']} on port {service['port']}...")
    cwd = os.path.join("/Users/satnaamsinghgandhi/Desktop/Clinova", service['dir'])
    log_file = f"/Users/satnaamsinghgandhi/Desktop/Clinova/logs/{service['name'].lower()}.log"
    os.makedirs("/Users/satnaamsinghgandhi/Desktop/Clinova/logs", exist_ok=True)
    
    with open(log_file, "w") as f:
        subprocess.Popen(service['cmd'], shell=True, cwd=cwd, stdout=f, stderr=f)

if __name__ == "__main__":
    for s in services:
        kill_port(s['port'])
    
    # Also kill 8000 just in case
    kill_port(8000)
    
    time.sleep(2)
    
    for s in services:
        start_service(s)
        time.sleep(1) # Give it a second to bind

    print("\n✅ All services have been restarted in the background.")
    print("Logs are available in the /logs directory.")
