"""
Voice Service — Kafka Producer
Publishes voice pipeline events to Upstash Kafka
"""
from kafka import KafkaProducer
import json, os, structlog

logger = structlog.get_logger()


class KafkaService:
    _producer = None

    @classmethod
    async def initialize(cls):
        broker = os.getenv("KAFKA_BROKER_URL", "")
        username = os.getenv("KAFKA_USERNAME", "")
        password = os.getenv("KAFKA_PASSWORD", "")
        if not broker:
            logger.warning("kafka_not_configured_voice")
            return
        try:
            kwargs = {
                "bootstrap_servers": broker,
                "value_serializer": lambda v: json.dumps(v).encode("utf-8"),
                "acks": "all",
            }
            if username:
                kwargs.update({
                    "security_protocol": "SASL_SSL",
                    "sasl_mechanism": "SCRAM-SHA-256",
                    "sasl_plain_username": username,
                    "sasl_plain_password": password,
                })
            cls._producer = KafkaProducer(**kwargs)
            logger.info("voice_kafka_producer_ready")
        except Exception as e:
            logger.warning("voice_kafka_init_failed", error=str(e))

    @classmethod
    async def publish(cls, topic: str, payload: dict):
        if not cls._producer:
            return
        try:
            cls._producer.send(topic, value=payload)
            cls._producer.flush(timeout=3)
        except Exception as e:
            logger.error("voice_kafka_publish_failed", topic=topic, error=str(e))

    @classmethod
    async def close(cls):
        if cls._producer:
            cls._producer.close()
