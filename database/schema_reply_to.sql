ALTER TABLE messages
ADD COLUMN reply_to_message_id INT NULL,
ADD CONSTRAINT fk_reply_to_message
FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL;
