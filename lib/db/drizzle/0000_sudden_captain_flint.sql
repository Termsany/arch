CREATE TYPE "public"."file_visibility" AS ENUM('internal', 'client_visible');--> statement-breakpoint
CREATE TYPE "public"."project_document_type" AS ENUM('quotation', 'project_report', 'boq', 'invoice');--> statement-breakpoint
CREATE TYPE "public"."project_task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."project_task_status" AS ENUM('todo', 'in_progress', 'review', 'done');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_message_status" AS ENUM('pending', 'sent', 'failed', 'simulated');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(50) DEFAULT 'team_member' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"invite_token_hash" text,
	"invite_expires_at" timestamp,
	"password_set_at" timestamp,
	"office_id" integer,
	"client_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer,
	"name" varchar(150) NOT NULL,
	"phone" varchar(50),
	"email" varchar(150),
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"office_id" integer,
	"project_name" varchar(200) NOT NULL,
	"design_type" varchar(100) NOT NULL,
	"area_meters" numeric(10, 2),
	"price_per_meter" numeric(10, 2),
	"total_design_price" numeric(10, 2),
	"project_status" varchar(100) DEFAULT 'جديد' NOT NULL,
	"start_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"stage_order" integer NOT NULL,
	"stage_name" varchar(200) NOT NULL,
	"status" varchar(100) DEFAULT 'لم تبدأ' NOT NULL,
	"notes" text,
	"client_feedback" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"stage_id" integer,
	"feedback_text" text NOT NULL,
	"feedback_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_estimates" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"category_id" integer,
	"phase_name" varchar(100) NOT NULL,
	"item_name" varchar(200) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(50),
	"unit_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"material_unit_cost" numeric(10, 2) DEFAULT '0',
	"labor_unit_cost" numeric(10, 2) DEFAULT '0',
	"waste_percentage" numeric(5, 2) DEFAULT '0',
	"profit_margin" numeric(5, 2) DEFAULT '0',
	"unit_cost_before_profit" numeric(10, 2) DEFAULT '0',
	"total_cost_before_profit" numeric(10, 2) DEFAULT '0',
	"total_price" numeric(10, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_ar" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"description_ar" text,
	"monthly_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"yearly_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"max_users" integer DEFAULT 1 NOT NULL,
	"max_projects" integer DEFAULT 0 NOT NULL,
	"max_clients" integer DEFAULT 0 NOT NULL,
	"storage_limit_mb" integer DEFAULT 0 NOT NULL,
	"has_client_portal" boolean DEFAULT false NOT NULL,
	"has_whatsapp_notifications" boolean DEFAULT false NOT NULL,
	"has_pdf_reports" boolean DEFAULT false NOT NULL,
	"has_team_roles" boolean DEFAULT false NOT NULL,
	"has_advanced_estimates" boolean DEFAULT false NOT NULL,
	"is_recommended" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offices" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_name" varchar(150) NOT NULL,
	"owner_name" varchar(150),
	"phone" varchar(50),
	"email" varchar(150),
	"address" text,
	"plan_id" integer,
	"subscription_status" varchar(50) DEFAULT 'trial' NOT NULL,
	"subscription_start" date,
	"subscription_end" date,
	"region" varchar(20) DEFAULT 'EG' NOT NULL,
	"default_language" varchar(10) DEFAULT 'ar' NOT NULL,
	"timezone" varchar(100) DEFAULT 'Africa/Cairo' NOT NULL,
	"currency" varchar(3) DEFAULT 'EGP' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "office_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"stage_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"approval_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"comment" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer,
	"project_id" integer NOT NULL,
	"stage_id" integer,
	"uploaded_by" integer,
	"file_name" varchar(300) NOT NULL,
	"original_name" varchar(300) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_url" text,
	"storage_provider" varchar(50) DEFAULT 'local' NOT NULL,
	"storage_key" text,
	"bucket_name" varchar(255),
	"content_type" varchar(255),
	"checksum" text,
	"file_type" varchar(100) NOT NULL,
	"file_size" bigint NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"visibility" "file_visibility" DEFAULT 'internal' NOT NULL,
	"file_category" varchar(100) DEFAULT 'Other' NOT NULL,
	"notes" text,
	"is_approved_version" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"document_type" "project_document_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"html_content" text NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"stage_id" integer,
	"assigned_to" integer,
	"created_by" integer,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" "project_task_status" DEFAULT 'todo' NOT NULL,
	"priority" "project_task_priority" DEFAULT 'medium' NOT NULL,
	"due_date" date,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer,
	"user_id" integer,
	"client_id" integer,
	"project_id" integer,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"notification_type" varchar(80) NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"item_name" varchar(200) NOT NULL,
	"description" text,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"payment_method" varchar(100),
	"reference_number" varchar(100),
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boq_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer,
	"name" varchar(150) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boq_items_library" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer,
	"category_id" integer,
	"item_name" varchar(200) NOT NULL,
	"default_unit" varchar(50),
	"default_material_cost" numeric(10, 2) DEFAULT '0',
	"default_labor_cost" numeric(10, 2) DEFAULT '0',
	"default_waste_percentage" numeric(5, 2) DEFAULT '0',
	"default_profit_margin" numeric(5, 2) DEFAULT '0',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer NOT NULL,
	"project_id" integer,
	"client_id" integer,
	"invoice_id" integer,
	"phone" varchar(50) NOT NULL,
	"message_body" text NOT NULL,
	"message_type" varchar(80) NOT NULL,
	"provider" varchar(80) NOT NULL,
	"provider_message_id" varchar(200),
	"status" "whatsapp_message_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"sent_by" integer,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer,
	"template_key" varchar(100) NOT NULL,
	"name_ar" varchar(200) NOT NULL,
	"message_body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer,
	"user_id" integer,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" integer,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" varchar(100),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_feedback" ADD CONSTRAINT "client_feedback_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_feedback" ADD CONSTRAINT "client_feedback_stage_id_project_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."project_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_estimates" ADD CONSTRAINT "project_estimates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_estimates" ADD CONSTRAINT "project_estimates_category_id_boq_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."boq_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offices" ADD CONSTRAINT "offices_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_settings" ADD CONSTRAINT "office_settings_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_approvals" ADD CONSTRAINT "stage_approvals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_approvals" ADD CONSTRAINT "stage_approvals_stage_id_project_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."project_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_approvals" ADD CONSTRAINT "stage_approvals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_stage_id_project_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."project_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_stage_id_project_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."project_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boq_categories" ADD CONSTRAINT "boq_categories_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boq_items_library" ADD CONSTRAINT "boq_items_library_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boq_items_library" ADD CONSTRAINT "boq_items_library_category_id_boq_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."boq_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_files_storage_provider" ON "project_files" USING btree ("storage_provider");--> statement-breakpoint
CREATE INDEX "idx_project_files_storage_key" ON "project_files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "idx_project_files_office_project" ON "project_files" USING btree ("office_id","project_id");--> statement-breakpoint
CREATE INDEX "project_documents_office_id_idx" ON "project_documents" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "project_documents_project_id_idx" ON "project_documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_tasks_office_id_idx" ON "project_tasks" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "project_tasks_project_id_idx" ON "project_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_tasks_assigned_to_idx" ON "project_tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "project_tasks_status_idx" ON "project_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_office_id_idx" ON "notifications" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_client_id_idx" ON "notifications" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "notifications_project_id_idx" ON "notifications" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_office_id_idx" ON "invoices" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "invoices_project_id_idx" ON "invoices" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "invoices_client_id_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_office_id_idx" ON "payments" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_project_id_idx" ON "payments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "payments_client_id_idx" ON "payments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_office_id_idx" ON "whatsapp_messages" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_project_id_idx" ON "whatsapp_messages" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_client_id_idx" ON "whatsapp_messages" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_invoice_id_idx" ON "whatsapp_messages" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_status_idx" ON "whatsapp_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_type_idx" ON "whatsapp_messages" USING btree ("message_type");--> statement-breakpoint
CREATE INDEX "whatsapp_templates_office_id_idx" ON "whatsapp_templates" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "whatsapp_templates_key_idx" ON "whatsapp_templates" USING btree ("template_key");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_office_id" ON "audit_logs" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity_type" ON "audit_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity_id" ON "audit_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");