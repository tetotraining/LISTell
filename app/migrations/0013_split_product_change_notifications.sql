ALTER TABLE list_notification_settings ADD COLUMN product_name_changed INTEGER NOT NULL DEFAULT 1;
ALTER TABLE list_notification_settings ADD COLUMN product_priority_changed INTEGER NOT NULL DEFAULT 1;
ALTER TABLE list_notification_settings ADD COLUMN product_name_priority_changed INTEGER NOT NULL DEFAULT 1;
UPDATE list_notification_settings
SET product_name_changed=product_changed,
    product_priority_changed=product_changed,
    product_name_priority_changed=product_changed;
