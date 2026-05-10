"""
Audit Service — Kafka Consumer
Consumes all Clinova events and persists audit records
"""
from kafka import KafkaConsumer
from kafka.errors import KafkaError
import json, os, asyncio, threading, structlog
from datetime import datetime

logger = structlog.get_logger()

TOPICS = [
    "patient.created",
    "audit.started",
    "transcription.completed",
    "diagnosis.generated",
    "device.data.received",
]


class KafkaConsumerService:
    _consumer: KafkaConsumer = None
    _running = False
    _thread: threading.Thread = None

    @classmethod
    async def start(cls):
        """Start Kafka consumer in a background thread."""
        broker = os.getenv("KAFKA_BROKER_URL", "")
        username = os.getenv("KAFKA_USERNAME", "")
        password = os.getenv("KAFKA_PASSWORD", "")

        if not broker:
            logger.warning("kafka_not_configured_skipping_consumer")
            return

        try:
            kwargs = {
                "bootstrap_servers": broker,
                "group_id": "clinova-audit-consumer",
                "auto_offset_reset": "earliest",
                "value_deserializer": lambda m: json.loads(m.decode("utf-8")),
                "enable_auto_commit": True,
            }
            if username:
                kwargs.update({
                    "security_protocol": "SASL_SSL",
                    "sasl_mechanism": "SCRAM-SHA-256",
                    "sasl_plain_username": username,
                    "sasl_plain_password": password,
                })

            cls._consumer = KafkaConsumer(*TOPICS, **kwargs)
            cls._running = True
            cls._thread = threading.Thread(target=cls._consume_loop, daemon=True)
            cls._thread.start()
            logger.info("kafka_consumer_started", topics=TOPICS)
        except Exception as e:
            logger.warning("kafka_consumer_init_failed", error=str(e))

    @classmethod
    def _consume_loop(cls):
        """Process Kafka messages and write audit records."""
        from routers.audit import _audit_store
        while cls._running:
            try:
                for message in cls._consumer:
                    if not cls._running:
                        break
                    event = {
                        "id": f"kafka-{message.offset}-{message.partition}",
                        "user_id": message.value.get("user_id", "system"),
                        "action": message.topic.upper().replace(".", "_"),
                        "resource": message.topic,
                        "resource_id": message.value.get("patient_id") or message.value.get("session_id"),
                        "ip_address": None,
                        "metadata": message.value,
                        "created_at": datetime.utcnow().isoformat() + "Z",
                    }
                    _audit_store.append(event)
                    logger.info("kafka_event_audited", topic=message.topic)
            except Exception as e:
                logger.error("kafka_consume_error", error=str(e))
                break

    @classmethod
    async def stop(cls):
        cls._running = False
        if cls._consumer:
            cls._consumer.close()
        logger.info("kafka_consumer_stopped")
