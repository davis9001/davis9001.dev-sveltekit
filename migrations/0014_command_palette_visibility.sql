-- Add command palette visibility flag for CMS content items
-- Ported from NebulaKit (0005). Lets any published content type opt into the
-- global command palette, per type and per item, instead of the palette being
-- hardcoded to blog posts.
ALTER TABLE content_items ADD COLUMN show_in_command_palette INTEGER NOT NULL DEFAULT 1;
