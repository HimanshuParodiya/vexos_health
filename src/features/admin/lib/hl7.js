// Headline figures from GET /hl7/stats.
export function summarizeHl7(stats) {
  const total = stats?.total_messages ?? 0;
  const success = stats?.by_status?.SUCCESS ?? 0;
  return {
    total,
    parsedPercent: total ? (success / total) * 100 : null,
    rejected: total - success,
    queue: stats?.pending_queue_total ?? 0,
    lastMessageAt: stats?.recent?.[0]?.ingested_at ?? null,
  };
}

export const SOURCE_TYPES = [
  { value: "local_file", label: "Local folder" },
  { value: "s3", label: "AWS S3" },
  { value: "sqs", label: "AWS SQS" },
  { value: "rabbitmq", label: "RabbitMQ" },
];

// Fields each source type needs (POST /hl7/source-config). `secret` fields are masked.
export const SOURCE_FIELDS = {
  local_file: [],
  s3: [
    { key: "bucket", label: "Bucket", placeholder: "vexos-hl7-landing" },
    { key: "prefix", label: "Prefix", placeholder: "incoming/" },
  ],
  sqs: [{ key: "queue_url", label: "Queue URL", placeholder: "https://sqs.<region>.amazonaws.com/<account>/<queue>" }],
  rabbitmq: [
    { key: "url", label: "AMQP URL", placeholder: "amqp://user:password@host:5672/", secret: true },
    { key: "queue_name", label: "Queue name", placeholder: "vexos_hl7_ingestion" },
  ],
};
