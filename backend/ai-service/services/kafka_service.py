"""
AI Service — Kafka Service
Upstash Kafka producer for Clinova events
"""
try:
    from kafka import KafkaProducer
    from kafka.errors import KafkaError
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False
    class KafkaProducer: pass
    class KafkaError(Exception): pass

import json, os, structlog
from typing import Optional

logger = structlog.get_logger()


class KafkaService:
    _producer: Optional[KafkaProducer] = None

    @classmethod
    async def initialize(cls):
        """Initialize Kafka producer with Upstash SSL config."""
        if not KAFKA_AVAILABLE:
            logger.warning("kafka_library_not_installed_skipping")
            return
        try:
            # Use a short timeout for the producer creation
            cls._producer = KafkaProducer(
                bootstrap_servers=os.getenv("KAFKA_BROKER_URL", "localhost:9092"),
                security_protocol="SASL_SSL",
                sasl_mechanism="SCRAM-SHA-256",
                sasl_plain_username=os.getenv("KAFKA_USERNAME", ""),
                sasl_plain_password=os.getenv("KAFKA_PASSWORD", ""),
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                acks="all",
                retries=1,
                request_timeout_ms=5000,
            )
            logger.info("kafka_producer_initialized")
        except Exception as e:
            logger.warning("kafka_init_failed_running_without_kafka", error=str(e))
            cls._producer = None

    @classmethod
    async def publish(cls, topic: str, payload: dict, key: Optional[str] = None):
        """Publish an event to a Kafka topic."""
        if not cls._producer:
            logger.warning("kafka_not_available_skipping_event", topic=topic)
            return False
        try:
            future = cls._producer.send(topic, value=payload, key=key)
            cls._producer.flush(timeout=5)
            logger.info("kafka_event_published", topic=topic, key=key)
            return True
        except KafkaError as e:
            logger.error("kafka_publish_failed", topic=topic, error=str(e))
            return False

    @classmethod
    async def close(cls):
        if cls._producer:
            cls._producer.close()
