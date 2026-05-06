import { and, eq, isNull } from "drizzle-orm";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db, pool } from ".";
import {
  boqCategoriesTable,
  clientFeedbackTable,
  clientsTable,
  invoiceItemsTable,
  invoicesTable,
  paymentsTable,
  projectDocumentsTable,
  projectEstimatesTable,
  projectFilesTable,
  officesTable,
  projectStagesTable,
  projectTasksTable,
  projectsTable,
  subscriptionPlansTable,
  usersTable,
  whatsappTemplatesTable,
} from "./schema";

const passwordHash = "$2b$12$UbxQPhHR.nNqOddA/bq.se4yV4dZ54qlWB84qs4WUcH6yZS5nQCui";
const uploadDir = process.env["UPLOAD_DIR"] ?? path.resolve(process.cwd(), "../../artifacts/api-server/uploads");
const defaultStages = [
  "الاتفاق مع العميل وتحديد نوع التصميم",
  "الاتفاق على سعر متر التصميم",
  "المعاينة ورفع المقاسات",
  "رسم Plan 2D",
  "Mood Board",
  "التصميم 3D",
  "إرسال التصميم للعميل وأخذ موافقة أو تعديل",
  "Shop Drawing واللوحات التنفيذية",
  "المقايسة على مراحل التنفيذ",
  "التنفيذ",
  "اختيار الفرش والمطبخ والحمام ومشتملات التشطيب",
  "التسليم النهائي",
];
const boqCategories = [
  { name: "أعمال الرفع والمعاينة", description: "رفع المقاسات، المعاينة، الحصر، وإعداد الرسومات الابتدائية" },
  { name: "أعمال الهدم والإزالة", description: "إزالة تشطيبات قديمة، تكسير حوائط، نقل مخلفات، وتجهيز الموقع" },
  { name: "أعمال المباني والطوب", description: "مباني طوب، قواطيع داخلية، فتحات، وتعديلات معمارية" },
  { name: "أعمال الخرسانة والترميم", description: "صب خرسانة، ترميمات، معالجات شروخ، وقواعد خفيفة" },
  { name: "أعمال المحارة واللياسة", description: "محارة داخلية وخارجية، طرطشة، بؤج وأوتار، ومعالجات سطح" },
  { name: "أعمال العزل", description: "عزل مائي وحراري للأسطح والحمامات والمطابخ والبدرومات" },
  { name: "أعمال السباكة والتغذية", description: "مواسير تغذية وصرف، نقاط صحية، محابس، واختبارات ضغط" },
  { name: "الأدوات الصحية والإكسسوارات", description: "خلاطات، أحواض، قواعد، بانيوهات، دش، وإكسسوارات حمامات" },
  { name: "أعمال الكهرباء الخفيفة", description: "تمديدات إنارة وبرايز، لوحات، مفاتيح، وتأسيس نقاط كهرباء" },
  { name: "أنظمة التيار الخفيف", description: "إنترنت، كاميرات، إنتركم، داتا، سمارت هوم، وصوتيات" },
  { name: "أعمال التكييف والتهوية", description: "تأسيسات تكييف، صرف، نحاس، دكتات، وفتحات تهوية" },
  { name: "أعمال مكافحة الحريق", description: "إنذار حريق، رشاشات، طفايات، ولوحات سلامة حسب الاحتياج" },
  { name: "أعمال الأرضيات", description: "بورسلين، سيراميك، رخام، باركيه، فينيل، وتركيب وزر" },
  { name: "أعمال الحوائط والتجاليد", description: "تكسيات حوائط، بدائل خشب، حجر، رخام، وديكورات جدارية" },
  { name: "أعمال الأسقف والجبس بورد", description: "أسقف معلقة، بيت نور، كرانيش، قطاعات جبس بورد، ومعجون فواصل" },
  { name: "أعمال الدهانات والتشطيبات النهائية", description: "معجون، برايمر، دهانات بلاستيك، ديكورات، ودهانات مقاومة رطوبة" },
  { name: "أعمال النجارة والأبواب", description: "أبواب خشب، حلوق، تجاليد، دواليب، مطابخ، ووحدات تفصيل" },
  { name: "أعمال الألوميتال والزجاج", description: "شبابيك، واجهات، سيكوريت، كبائن شاور، وقطاعات ألومنيوم" },
  { name: "أعمال الحديد والاستانلس", description: "درابزين، سلالم، بوابات، قطاعات معدنية، وإكسسوارات استانلس" },
  { name: "أعمال المطابخ", description: "وحدات مطبخ، رخام، إكسسوارات، أجهزة مدمجة، وتأسيسات خاصة" },
  { name: "أعمال الإضاءة والنجف", description: "سبوتات، بروفايلات LED، نجف، أباليك، ووحدات إضاءة ديكورية" },
  { name: "الأثاث والفرش", description: "أثاث جاهز أو تفصيل، مفروشات، ستائر، سجاد، وإكسسوارات" },
  { name: "أعمال الواجهات", description: "واجهات خارجية، كلادينج، دهانات خارجية، حجر، وزجاج واجهات" },
  { name: "أعمال اللاندسكيب", description: "زراعة، ري، أرضيات خارجية، جلسات، إضاءة حدائق، ونوافير" },
  { name: "أعمال حمامات السباحة", description: "تأسيس وتنفيذ حمامات سباحة، عزل، ميكانيكا، وتشطيبات" },
  { name: "الأعمال الميكانيكية العامة", description: "مضخات، خزانات، صرف، تهوية، وغرف خدمات" },
  { name: "الأعمال الصحية للمطاعم والكافيهات", description: "مصايد دهون، تجهيزات مطابخ تجارية، صرف خاص، وستانلس" },
  { name: "التجهيزات الطبية والتجارية", description: "تجهيز عيادات، محلات، مكاتب، كاونترات، وتجهيزات تشغيل" },
  { name: "النظافة والتسليم", description: "نظافة بعد التشطيب، معالجة ملاحظات، وتسليم نهائي للعميل" },
  { name: "إدارة الموقع والمصاريف غير المباشرة", description: "إشراف، نقل، سقالات، حماية، هالك، ومصاريف تشغيل الموقع" },
];
const whatsappTemplates = [
  {
    templateKey: "client_approval_request",
    nameAr: "طلب موافقة العميل",
    messageBody: 'مرحباً {{client_name}}، برجاء مراجعة المرحلة "{{stage_name}}" الخاصة بمشروع "{{project_name}}" من خلال الرابط التالي: {{portal_link}}',
  },
  {
    templateKey: "client_revision_update",
    nameAr: "تحديث طلب تعديل",
    messageBody: 'مرحباً {{client_name}}، تم استلام طلب التعديل الخاص بمشروع "{{project_name}}" وسيقوم الفريق بمراجعته.',
  },
  {
    templateKey: "file_uploaded",
    nameAr: "ملف جديد",
    messageBody: 'مرحباً {{client_name}}، تم رفع ملف جديد لمشروع "{{project_name}}". يمكنك مراجعته من بوابة العميل: {{portal_link}}',
  },
  {
    templateKey: "quotation_created",
    nameAr: "عرض سعر جديد",
    messageBody: 'مرحباً {{client_name}}، تم إنشاء عرض سعر لمشروع "{{project_name}}". برجاء مراجعته مع فريق المكتب.',
  },
  {
    templateKey: "invoice_created",
    nameAr: "فاتورة جديدة",
    messageBody: 'مرحباً {{client_name}}، تم إصدار فاتورة جديدة لمشروع "{{project_name}}" بإجمالي {{total_amount}}.',
  },
  {
    templateKey: "payment_reminder",
    nameAr: "تذكير بدفعة",
    messageBody: 'مرحباً {{client_name}}، نذكركم بوجود دفعة مستحقة لمشروع "{{project_name}}" بقيمة {{remaining_amount}}.',
  },
];

async function ensurePlan() {
  const existing = await db
    .select()
    .from(subscriptionPlansTable)
    .where(eq(subscriptionPlansTable.nameEn, "pro"))
    .limit(1);

  if (existing[0]) return existing[0];

  const [plan] = await db
    .insert(subscriptionPlansTable)
    .values({
      nameAr: "الخطة الاحترافية",
      nameEn: "pro",
      descriptionAr: "خطة افتراضية لتجربة النظام محلياً",
      monthlyPrice: "0",
      yearlyPrice: "0",
      maxUsers: 10,
      maxProjects: 100,
      maxClients: 100,
      storageLimitMb: 1024,
      hasClientPortal: true,
      hasPdfReports: true,
      hasTeamRoles: true,
      hasAdvancedEstimates: true,
      isActive: true,
      isRecommended: true,
      sortOrder: 1,
    })
    .returning();

  return plan!;
}

async function ensureOffice(officeName: string, ownerName: string, email: string, planId: number) {
  const existing = await db.select().from(officesTable).where(eq(officesTable.email, email)).limit(1);
  if (existing[0]) return existing[0];

  const [office] = await db
    .insert(officesTable)
    .values({
      officeName,
      ownerName,
      email,
      phone: "01000000000",
      address: "القاهرة",
      planId,
      subscriptionStatus: "active",
      subscriptionStart: "2026-01-01",
      subscriptionEnd: "2027-01-01",
    })
    .returning();

  return office!;
}

async function ensureClient(params: {
  officeId: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
}) {
  const existing = await db.select().from(clientsTable).where(eq(clientsTable.email, params.email)).limit(1);
  if (existing[0]) {
    const [updated] = await db
      .update(clientsTable)
      .set({ ...params, updatedAt: new Date() })
      .where(eq(clientsTable.id, existing[0].id))
      .returning();

    return updated!;
  }

  const [client] = await db
    .insert(clientsTable)
    .values(params)
    .returning();

  return client!;
}

async function ensureProject(params: {
  clientId: number;
  officeId: number;
  projectName: string;
  designType: string;
  areaMeters: string;
  pricePerMeter: string;
  projectStatus: string;
  startDate: string;
  notes: string;
  completedStages?: number;
}) {
  const totalDesignPrice = String(Number(params.areaMeters) * Number(params.pricePerMeter));
  const existing = await db.select().from(projectsTable).where(eq(projectsTable.projectName, params.projectName)).limit(1);
  const projectValues = {
    clientId: params.clientId,
    officeId: params.officeId,
    projectName: params.projectName,
    designType: params.designType,
    areaMeters: params.areaMeters,
    pricePerMeter: params.pricePerMeter,
    totalDesignPrice,
    projectStatus: params.projectStatus,
    startDate: params.startDate,
    notes: params.notes,
  };

  const project = existing[0]
    ? (
        await db
          .update(projectsTable)
          .set({ ...projectValues, updatedAt: new Date() })
          .where(eq(projectsTable.id, existing[0].id))
          .returning()
      )[0]!
    : (await db.insert(projectsTable).values(projectValues).returning())[0]!;

  const stages = await db.select().from(projectStagesTable).where(eq(projectStagesTable.projectId, project.id)).limit(1);
  if (!stages[0]) {
    await db.insert(projectStagesTable).values(
      defaultStages.map((stageName, index) => ({
        projectId: project.id,
        stageOrder: index + 1,
        stageName,
        status:
          index < (params.completedStages ?? 0)
            ? "مكتملة"
            : index === (params.completedStages ?? 0)
              ? "جاري العمل"
              : "لم تبدأ",
      })),
    );
  }

  return project;
}

async function ensureBoqCategories(officeId: number) {
  for (const [index, category] of boqCategories.entries()) {
    const existing = await db
      .select()
      .from(boqCategoriesTable)
      .where(and(eq(boqCategoriesTable.officeId, officeId), eq(boqCategoriesTable.name, category.name)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(boqCategoriesTable)
        .set({
          description: category.description,
          sortOrder: index + 1,
          updatedAt: new Date(),
        })
        .where(eq(boqCategoriesTable.id, existing[0].id));
      continue;
    }

    await db.insert(boqCategoriesTable).values({
      officeId,
      name: category.name,
      description: category.description,
      sortOrder: index + 1,
    });
  }
}

async function ensureWhatsappTemplates(officeId: number | null = null) {
  for (const template of whatsappTemplates) {
    const existing = await db
      .select()
      .from(whatsappTemplatesTable)
      .where(
        officeId
          ? and(eq(whatsappTemplatesTable.officeId, officeId), eq(whatsappTemplatesTable.templateKey, template.templateKey))
          : and(isNull(whatsappTemplatesTable.officeId), eq(whatsappTemplatesTable.templateKey, template.templateKey)),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(whatsappTemplatesTable)
        .set({ nameAr: template.nameAr, messageBody: template.messageBody, isActive: true, updatedAt: new Date() })
        .where(eq(whatsappTemplatesTable.id, existing[0].id));
      continue;
    }

    await db.insert(whatsappTemplatesTable).values({
      officeId,
      templateKey: template.templateKey,
      nameAr: template.nameAr,
      messageBody: template.messageBody,
      isActive: true,
    });
  }
}

async function ensureUser(params: {
  name: string;
  email: string;
  role: string;
  officeId?: number | null;
  clientId?: number | null;
}) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, params.email)).limit(1);
  if (existing[0]) {
    const [updated] = await db
      .update(usersTable)
      .set({
        name: params.name,
        role: params.role,
        officeId: params.officeId ?? null,
        clientId: params.clientId ?? null,
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, existing[0].id))
      .returning();

    return updated!;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      ...params,
      passwordHash,
    })
    .returning();

  return user!;
}

async function getCategoryId(officeId: number, name: string) {
  const rows = await db
    .select({ id: boqCategoriesTable.id })
    .from(boqCategoriesTable)
    .where(and(eq(boqCategoriesTable.officeId, officeId), eq(boqCategoriesTable.name, name)))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function ensureEstimate(params: {
  projectId: number;
  categoryId: number | null;
  phaseName: string;
  itemName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  notes?: string;
}) {
  const existing = await db
    .select()
    .from(projectEstimatesTable)
    .where(and(eq(projectEstimatesTable.projectId, params.projectId), eq(projectEstimatesTable.itemName, params.itemName)))
    .limit(1);
  const totalPrice = String(Number(params.quantity) * Number(params.unitPrice));
  const values = {
    projectId: params.projectId,
    categoryId: params.categoryId,
    phaseName: params.phaseName,
    itemName: params.itemName,
    quantity: params.quantity,
    unit: params.unit,
    unitPrice: params.unitPrice,
    materialUnitCost: String(Number(params.unitPrice) * 0.62),
    laborUnitCost: String(Number(params.unitPrice) * 0.28),
    wastePercentage: "5",
    profitMargin: "18",
    unitCostBeforeProfit: String(Number(params.unitPrice) * 0.9),
    totalCostBeforeProfit: String(Number(totalPrice) * 0.9),
    totalPrice,
    notes: params.notes ?? null,
  };

  if (existing[0]) {
    await db.update(projectEstimatesTable).set({ ...values, updatedAt: new Date() }).where(eq(projectEstimatesTable.id, existing[0].id));
    return;
  }

  await db.insert(projectEstimatesTable).values(values);
}

async function ensureTask(params: {
  officeId: number;
  projectId: number;
  stageOrder: number;
  assignedTo: number | null;
  createdBy: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
}) {
  const stage = await db
    .select({ id: projectStagesTable.id })
    .from(projectStagesTable)
    .where(and(eq(projectStagesTable.projectId, params.projectId), eq(projectStagesTable.stageOrder, params.stageOrder)))
    .limit(1);
  const existing = await db
    .select()
    .from(projectTasksTable)
    .where(and(eq(projectTasksTable.projectId, params.projectId), eq(projectTasksTable.title, params.title)))
    .limit(1);
  const values = {
    officeId: params.officeId,
    projectId: params.projectId,
    stageId: stage[0]?.id ?? null,
    assignedTo: params.assignedTo,
    createdBy: params.createdBy,
    title: params.title,
    description: params.description,
    status: params.status,
    priority: params.priority,
    dueDate: params.dueDate,
    completedAt: params.status === "done" ? new Date(`${params.dueDate}T10:00:00.000Z`) : null,
  };

  if (existing[0]) {
    await db.update(projectTasksTable).set({ ...values, updatedAt: new Date() }).where(eq(projectTasksTable.id, existing[0].id));
    return;
  }

  await db.insert(projectTasksTable).values(values);
}

async function ensureFeedback(params: { projectId: number; stageOrder: number; feedbackText: string; feedbackType: string }) {
  const stage = await db
    .select({ id: projectStagesTable.id })
    .from(projectStagesTable)
    .where(and(eq(projectStagesTable.projectId, params.projectId), eq(projectStagesTable.stageOrder, params.stageOrder)))
    .limit(1);
  const existing = await db
    .select()
    .from(clientFeedbackTable)
    .where(and(eq(clientFeedbackTable.projectId, params.projectId), eq(clientFeedbackTable.feedbackText, params.feedbackText)))
    .limit(1);
  if (existing[0]) return;
  await db.insert(clientFeedbackTable).values({
    projectId: params.projectId,
    stageId: stage[0]?.id ?? null,
    feedbackText: params.feedbackText,
    feedbackType: params.feedbackType,
  });
}

async function ensureInvoice(params: {
  officeId: number;
  projectId: number;
  clientId: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  taxAmount: string;
  discountAmount: string;
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
  createdBy: number;
  notes: string;
  items: Array<{ itemName: string; description: string; quantity: string; unitPrice: string }>;
  payments?: Array<{ amount: string; paymentDate: string; paymentMethod: string; referenceNumber: string; notes: string }>;
}) {
  const subtotal = params.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
  const paidAmount = (params.payments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalAmount = subtotal + Number(params.taxAmount) - Number(params.discountAmount);
  const existing = await db.select().from(invoicesTable).where(eq(invoicesTable.invoiceNumber, params.invoiceNumber)).limit(1);
  const invoiceValues = {
    officeId: params.officeId,
    projectId: params.projectId,
    clientId: params.clientId,
    invoiceNumber: params.invoiceNumber,
    issueDate: params.issueDate,
    dueDate: params.dueDate,
    subtotal: subtotal.toFixed(2),
    taxAmount: params.taxAmount,
    discountAmount: params.discountAmount,
    totalAmount: totalAmount.toFixed(2),
    paidAmount: paidAmount.toFixed(2),
    status: params.status,
    notes: params.notes,
    createdBy: params.createdBy,
  };

  const invoice = existing[0]
    ? (await db.update(invoicesTable).set({ ...invoiceValues, updatedAt: new Date() }).where(eq(invoicesTable.id, existing[0].id)).returning())[0]!
    : (await db.insert(invoicesTable).values(invoiceValues).returning())[0]!;

  for (const item of params.items) {
    const existingItem = await db
      .select()
      .from(invoiceItemsTable)
      .where(and(eq(invoiceItemsTable.invoiceId, invoice.id), eq(invoiceItemsTable.itemName, item.itemName)))
      .limit(1);
    const totalPrice = (Number(item.quantity) * Number(item.unitPrice)).toFixed(2);
    const values = {
      invoiceId: invoice.id,
      itemName: item.itemName,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice,
    };
    if (existingItem[0]) {
      await db.update(invoiceItemsTable).set({ ...values, updatedAt: new Date() }).where(eq(invoiceItemsTable.id, existingItem[0].id));
    } else {
      await db.insert(invoiceItemsTable).values(values);
    }
  }

  for (const payment of params.payments ?? []) {
    const existingPayment = await db
      .select()
      .from(paymentsTable)
      .where(and(eq(paymentsTable.invoiceId, invoice.id), eq(paymentsTable.referenceNumber, payment.referenceNumber)))
      .limit(1);
    const values = {
      officeId: params.officeId,
      invoiceId: invoice.id,
      projectId: params.projectId,
      clientId: params.clientId,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber,
      notes: payment.notes,
      createdBy: params.createdBy,
    };
    if (existingPayment[0]) {
      await db.update(paymentsTable).set({ ...values, updatedAt: new Date() }).where(eq(paymentsTable.id, existingPayment[0].id));
    } else {
      await db.insert(paymentsTable).values(values);
    }
  }
}

async function ensureDocument(params: {
  officeId: number;
  projectId: number;
  documentType: "quotation" | "project_report" | "boq" | "invoice";
  title: string;
  createdBy: number;
  htmlContent: string;
}) {
  const existing = await db
    .select()
    .from(projectDocumentsTable)
    .where(and(eq(projectDocumentsTable.projectId, params.projectId), eq(projectDocumentsTable.title, params.title)))
    .limit(1);
  const values = {
    officeId: params.officeId,
    projectId: params.projectId,
    documentType: params.documentType,
    title: params.title,
    htmlContent: params.htmlContent,
    createdBy: params.createdBy,
  };
  if (existing[0]) {
    await db.update(projectDocumentsTable).set({ ...values, updatedAt: new Date() }).where(eq(projectDocumentsTable.id, existing[0].id));
    return;
  }
  await db.insert(projectDocumentsTable).values(values);
}

async function ensureProjectFile(params: {
  officeId: number;
  projectId: number;
  stageOrder: number | null;
  uploadedBy: number;
  fileName: string;
  originalName: string;
  fileCategory: string;
  visibility: "internal" | "client_visible";
  notes: string;
  content: string;
  versionNumber?: number;
  isApprovedVersion?: boolean;
}) {
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, params.fileName);
  await writeFile(filePath, params.content, "utf8");

  const stage = params.stageOrder
    ? await db
        .select({ id: projectStagesTable.id })
        .from(projectStagesTable)
        .where(and(eq(projectStagesTable.projectId, params.projectId), eq(projectStagesTable.stageOrder, params.stageOrder)))
        .limit(1)
    : [];

  const existing = await db
    .select()
    .from(projectFilesTable)
    .where(and(eq(projectFilesTable.projectId, params.projectId), eq(projectFilesTable.originalName, params.originalName)))
    .limit(1);

  const values = {
    officeId: params.officeId,
    projectId: params.projectId,
    stageId: stage[0]?.id ?? null,
    uploadedBy: params.uploadedBy,
    fileName: params.fileName,
    originalName: params.originalName,
    filePath: `/uploads/${params.fileName}`,
    fileUrl: null,
    storageProvider: "local",
    fileType: "text/plain",
    fileSize: Buffer.byteLength(params.content, "utf8"),
    versionNumber: params.versionNumber ?? 1,
    visibility: params.visibility,
    fileCategory: params.fileCategory,
    notes: params.notes,
    isApprovedVersion: params.isApprovedVersion ?? false,
  };

  if (existing[0]) {
    await db.update(projectFilesTable).set({ ...values, updatedAt: new Date() }).where(eq(projectFilesTable.id, existing[0].id));
    return;
  }

  await db.insert(projectFilesTable).values(values);
}

async function seedFullProjectWorkflow(params: {
  project: { id: number; officeId: number | null; clientId: number; projectName: string; areaMeters: string | null };
  createdBy: number;
  assignedTo: number | null;
}) {
  const officeId = params.project.officeId!;
  const paintCategoryId = await getCategoryId(officeId, "أعمال الدهانات والتشطيبات النهائية");
  const ceilingCategoryId = await getCategoryId(officeId, "أعمال الأسقف والجبس بورد");
  const floorCategoryId = await getCategoryId(officeId, "أعمال الأرضيات");
  const electricCategoryId = await getCategoryId(officeId, "أعمال الكهرباء الخفيفة");

  await ensureEstimate({
    projectId: params.project.id,
    categoryId: floorCategoryId,
    phaseName: "مرحلة التشطيبات",
    itemName: "توريد وتركيب أرضيات بورسلين فرز أول",
    quantity: params.project.areaMeters ?? "120",
    unit: "م2",
    unitPrice: "780",
    notes: "يشمل لاصق، فواصل، وزر، وهالك 5%",
  });
  await ensureEstimate({
    projectId: params.project.id,
    categoryId: ceilingCategoryId,
    phaseName: "مرحلة التشطيبات",
    itemName: "أسقف جبس بورد مقاوم للرطوبة مع بيت نور",
    quantity: "95",
    unit: "م2",
    unitPrice: "520",
    notes: "قطاعات معدنية مع شريط LED مخفي",
  });
  await ensureEstimate({
    projectId: params.project.id,
    categoryId: paintCategoryId,
    phaseName: "مرحلة التشطيبات",
    itemName: "دهانات داخلية قابلة للغسيل",
    quantity: "420",
    unit: "م2",
    unitPrice: "145",
    notes: "وجه برايمر ووجهين تشطيب",
  });
  await ensureEstimate({
    projectId: params.project.id,
    categoryId: electricCategoryId,
    phaseName: "مرحلة التأسيس",
    itemName: "نقاط كهرباء وإنارة كاملة",
    quantity: "68",
    unit: "نقطة",
    unitPrice: "390",
    notes: "يشمل مواسير، أسلاك، علب، واختبار",
  });

  await ensureTask({
    officeId,
    projectId: params.project.id,
    stageOrder: 3,
    assignedTo: params.assignedTo,
    createdBy: params.createdBy,
    title: "مراجعة رفع المقاسات مع العميل",
    description: "مطابقة المقاسات النهائية مع المخطط قبل اعتماد Plan 2D.",
    status: "done",
    priority: "high",
    dueDate: "2026-05-01",
  });
  await ensureTask({
    officeId,
    projectId: params.project.id,
    stageOrder: 6,
    assignedTo: params.assignedTo,
    createdBy: params.createdBy,
    title: "تجهيز لقطات 3D للمساحات الرئيسية",
    description: "إخراج لقطات الريسبشن، المطبخ، وغرفة النوم الرئيسية.",
    status: "in_progress",
    priority: "medium",
    dueDate: "2026-05-12",
  });
  await ensureTask({
    officeId,
    projectId: params.project.id,
    stageOrder: 9,
    assignedTo: params.createdBy,
    createdBy: params.createdBy,
    title: "مراجعة بنود المقايسة قبل عرض السعر",
    description: "التأكد من الكميات والأسعار وربط البنود بمراحل التنفيذ.",
    status: "review",
    priority: "urgent",
    dueDate: "2026-05-15",
  });

  await ensureFeedback({
    projectId: params.project.id,
    stageOrder: 7,
    feedbackText: "العميل وافق على الاتجاه العام للتصميم مع طلب تهدئة ألوان غرفة المعيشة.",
    feedbackType: "revision_requested",
  });

  await ensureProjectFile({
    officeId,
    projectId: params.project.id,
    stageOrder: 3,
    uploadedBy: params.createdBy,
    fileName: `demo-project-${params.project.id}-site-measurements.txt`,
    originalName: "محضر رفع المقاسات.txt",
    fileCategory: "Site Survey",
    visibility: "internal",
    notes: "ملف تجريبي لمحضر المعاينة ورفع المقاسات.",
    content: `محضر رفع المقاسات\nالمشروع: ${params.project.projectName}\nتمت مراجعة الأبعاد الرئيسية وربطها بمراحل التصميم.\n`,
    isApprovedVersion: true,
  });
  await ensureProjectFile({
    officeId,
    projectId: params.project.id,
    stageOrder: 7,
    uploadedBy: params.createdBy,
    fileName: `demo-project-${params.project.id}-client-preview.txt`,
    originalName: "ملف عرض للعميل.txt",
    fileCategory: "Client Presentation",
    visibility: "client_visible",
    notes: "ملف تجريبي ظاهر للعميل في بوابة العميل.",
    content: `عرض للعميل\nالمشروع: ${params.project.projectName}\nهذا ملف تجريبي يمكن استخدامه لاختبار ظهور الملفات للعميل.\n`,
    versionNumber: 2,
  });

  await ensureInvoice({
    officeId,
    projectId: params.project.id,
    clientId: params.project.clientId,
    invoiceNumber: `INV-DEMO-${params.project.id}`,
    issueDate: "2026-05-05",
    dueDate: "2026-05-20",
    taxAmount: "3500",
    discountAmount: "1500",
    status: "partially_paid",
    createdBy: params.createdBy,
    notes: "فاتورة تجريبية مرتبطة بالمقايسة والدفعات اليدوية.",
    items: [
      { itemName: "دفعة تصميم مبدئية", description: "اعتماد التصميم وتوزيع الفراغات", quantity: "1", unitPrice: "25000" },
      { itemName: "إعداد لوحات تنفيذية", description: "Shop drawings ومراجعة تفاصيل التنفيذ", quantity: "1", unitPrice: "18000" },
      { itemName: "إدارة مقايسة التشطيبات", description: "حصر بنود وتشغيل ومراجعة أسعار", quantity: "1", unitPrice: "12000" },
    ],
    payments: [
      {
        amount: "22000",
        paymentDate: "2026-05-06",
        paymentMethod: "تحويل بنكي",
        referenceNumber: `PAY-DEMO-${params.project.id}-01`,
        notes: "دفعة مقدمة من العميل",
      },
    ],
  });

  await ensureDocument({
    officeId,
    projectId: params.project.id,
    documentType: "quotation",
    title: `عرض سعر مبدئي - ${params.project.projectName}`,
    createdBy: params.createdBy,
    htmlContent: `
      <article dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8">
        <h1>عرض سعر مبدئي</h1>
        <p><strong>المشروع:</strong> ${params.project.projectName}</p>
        <p>يشمل هذا العرض التصميم، اللوحات التنفيذية، ومراجعة المقايسة طبقاً للبيانات التجريبية.</p>
      </article>
    `,
  });
  await ensureDocument({
    officeId,
    projectId: params.project.id,
    documentType: "project_report",
    title: `تقرير حالة المشروع - ${params.project.projectName}`,
    createdBy: params.createdBy,
    htmlContent: `
      <article dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8">
        <h1>تقرير حالة المشروع</h1>
        <p><strong>المشروع:</strong> ${params.project.projectName}</p>
        <p>تم إنشاء هذا التقرير كنموذج لمتابعة المراحل، المهام، المقايسة، والمدفوعات.</p>
      </article>
    `,
  });
}

async function main() {
  const plan = await ensurePlan();
  const office1 = await ensureOffice("مكتب التصميم الأول", "مدير المكتب الأول", "office1@example.com", plan.id);
  const office2 = await ensureOffice("مكتب التصميم الثاني", "مدير المكتب الثاني", "office2@example.com", plan.id);
  await ensureBoqCategories(office1.id);
  await ensureBoqCategories(office2.id);
  await ensureWhatsappTemplates(null);
  await ensureWhatsappTemplates(office1.id);
  await ensureWhatsappTemplates(office2.id);
  const client = await ensureClient({
    officeId: office1.id,
    name: "أحمد منصور",
    email: "client@example.com",
    phone: "01000000001",
    address: "كمبوند هايد بارك، القاهرة الجديدة",
    notes: "عميل بوابة العملاء الافتراضي - فيلا دوبلكس بتشطيب فاخر",
  });
  const clients = [
    client,
    await ensureClient({
      officeId: office1.id,
      name: "د. مريم الخولي",
      email: "mariam.kholy@example.com",
      phone: "01012345678",
      address: "التجمع الخامس، القاهرة الجديدة",
      notes: "شقة عائلية، تفضّل ألوان هادئة وخامات سهلة التنظيف",
    }),
    await ensureClient({
      officeId: office1.id,
      name: "شركة كايرو كريتيف",
      email: "hello@cairocreative.example",
      phone: "01022223333",
      address: "القرية الذكية، الجيزة",
      notes: "مقر إداري مفتوح مع غرف اجتماعات واستقبال",
    }),
    await ensureClient({
      officeId: office1.id,
      name: "سارة عبدالعزيز",
      email: "sara.aziz@example.com",
      phone: "01144445555",
      address: "الشيخ زايد، الجيزة",
      notes: "تجديد مطبخ وحمام رئيسي مع الحفاظ على الأرضيات الحالية",
    }),
    await ensureClient({
      officeId: office2.id,
      name: "مطعم بيت الشام",
      email: "beit.elsham@example.com",
      phone: "01277778888",
      address: "سموحة، الإسكندرية",
      notes: "تصميم مطعم عائلي بهوية شرقية عصرية",
    }),
    await ensureClient({
      officeId: office2.id,
      name: "عيادات نور التخصصية",
      email: "nour.clinics@example.com",
      phone: "01299990000",
      address: "جليم، الإسكندرية",
      notes: "عيادة جلدية وتجميل، الأولوية لمسارات الحركة والخصوصية",
    }),
    await ensureClient({
      officeId: office1.id,
      name: "محمود وندى الشافعي",
      email: "elnada.home@example.com",
      phone: "01055556666",
      address: "مدينتي، القاهرة",
      notes: "منزل عائلي جديد، الأولوية لتقسيم عملي وغرفة معيشة واسعة",
    }),
    await ensureClient({
      officeId: office1.id,
      name: "شركة لينك سبيس",
      email: "ops@linkspace.example",
      phone: "01066667777",
      address: "المعادي، القاهرة",
      notes: "مكتب تقني صغير يحتاج توزيع مرن ومساحة اجتماعات",
    }),
    await ensureClient({
      officeId: office1.id,
      name: "كافيه ريفا",
      email: "hello@riva-cafe.example",
      phone: "01177778888",
      address: "مول العرب، 6 أكتوبر",
      notes: "كافيه بوتيك، مطلوب هوية دافئة وتجربة تصوير جذابة",
    }),
    await ensureClient({
      officeId: office2.id,
      name: "فندق بلو باي",
      email: "projects@bluebay.example",
      phone: "01211112222",
      address: "المعمورة، الإسكندرية",
      notes: "تجديد لوبي الفندق وعدد من الغرف النموذجية",
    }),
    await ensureClient({
      officeId: office2.id,
      name: "صيدليات الحياة",
      email: "fitout@hayah-pharma.example",
      phone: "01233334444",
      address: "ميامي، الإسكندرية",
      notes: "فرع صيدلية جديد مع مخزن صغير ومنطقة مستحضرات تجميل",
    }),
  ];

  const projectVilla = await ensureProject({
    clientId: clients[0].id,
    officeId: office1.id,
    projectName: "فيلا أحمد منصور - تصميم داخلي كامل",
    designType: "تصميم داخلي وتشطيب",
    areaMeters: "320",
    pricePerMeter: "450",
    projectStatus: "جاري العمل",
    startDate: "2026-04-05",
    completedStages: 5,
    notes: "ستايل Modern Classic، مطلوب مخططات تنفيذية ومقايسة تفصيلية قبل بدء التنفيذ.",
  });
  const projectApartment = await ensureProject({
    clientId: clients[1].id,
    officeId: office1.id,
    projectName: "شقة د. مريم الخولي - تشطيب وتجهيز",
    designType: "تشطيب شقة",
    areaMeters: "185",
    pricePerMeter: "380",
    projectStatus: "في انتظار موافقة العميل",
    startDate: "2026-04-18",
    completedStages: 6,
    notes: "تصميم عملي لعائلة من 4 أفراد مع غرفة مكتب منزلية.",
  });
  const projectOffice = await ensureProject({
    clientId: clients[2].id,
    officeId: office1.id,
    projectName: "مقر شركة كايرو كريتيف",
    designType: "تصميم إداري",
    areaMeters: "520",
    pricePerMeter: "300",
    projectStatus: "جديد",
    startDate: "2026-05-01",
    completedStages: 2,
    notes: "Open space، غرف اجتماعات، phone booths، ومنطقة استقبال للشركة.",
  });
  const projectKitchen = await ensureProject({
    clientId: clients[3].id,
    officeId: office1.id,
    projectName: "تجديد مطبخ وحمام - سارة عبدالعزيز",
    designType: "تجديد جزئي",
    areaMeters: "42",
    pricePerMeter: "650",
    projectStatus: "التنفيذ",
    startDate: "2026-03-20",
    completedStages: 9,
    notes: "تجديد سريع مع جدول تنفيذ مضغوط وتنسيق مباشر مع المقاول.",
  });
  const projectRestaurant = await ensureProject({
    clientId: clients[4].id,
    officeId: office2.id,
    projectName: "مطعم بيت الشام - تصميم وتجهيز",
    designType: "تصميم تجاري",
    areaMeters: "260",
    pricePerMeter: "420",
    projectStatus: "جاري العمل",
    startDate: "2026-04-10",
    completedStages: 4,
    notes: "تصميم مطعم 90 كرسي، واجهة، كاشير، مطبخ تحضيري، ومنطقة انتظار.",
  });
  const projectClinic = await ensureProject({
    clientId: clients[5].id,
    officeId: office2.id,
    projectName: "عيادات نور التخصصية - تصميم عيادة",
    designType: "تصميم طبي",
    areaMeters: "210",
    pricePerMeter: "500",
    projectStatus: "Shop Drawing واللوحات التنفيذية",
    startDate: "2026-03-28",
    completedStages: 7,
    notes: "توزيع غرف كشف وإجراءات واستقبال مع مراعاة الخصوصية وسهولة التعقيم.",
  });
  const projectFamilyHome = await ensureProject({
    clientId: clients[6].id,
    officeId: office1.id,
    projectName: "منزل عائلة الشافعي - مدينتي",
    designType: "تصميم داخلي سكني",
    areaMeters: "240",
    pricePerMeter: "410",
    projectStatus: "الاتفاق على سعر متر التصميم",
    startDate: "2026-05-03",
    completedStages: 1,
    notes: "نموذج مشروع في بداية الـ workflow: تم تحديد نوع التصميم وجاري تثبيت سعر المتر.",
  });
  const projectLinkspace = await ensureProject({
    clientId: clients[7].id,
    officeId: office1.id,
    projectName: "مكتب لينك سبيس - المعادي",
    designType: "تصميم إداري",
    areaMeters: "150",
    pricePerMeter: "330",
    projectStatus: "رسم Plan 2D",
    startDate: "2026-04-25",
    completedStages: 3,
    notes: "نموذج يوضح منتصف مرحلة التخطيط: المعاينة انتهت وجاري إعداد Plan 2D.",
  });
  const projectCafe = await ensureProject({
    clientId: clients[8].id,
    officeId: office1.id,
    projectName: "كافيه ريفا - مول العرب",
    designType: "تصميم تجاري",
    areaMeters: "95",
    pricePerMeter: "520",
    projectStatus: "Mood Board",
    startDate: "2026-04-30",
    completedStages: 4,
    notes: "نموذج مشروع تجاري في مرحلة الهوية البصرية والـ mood board.",
  });
  const projectRoof = await ensureProject({
    clientId: clients[6].id,
    officeId: office1.id,
    projectName: "روف عائلة الشافعي - جلسة خارجية",
    designType: "لاندسكيب وتراس",
    areaMeters: "80",
    pricePerMeter: "360",
    projectStatus: "إرسال التصميم للعميل وأخذ موافقة أو تعديل",
    startDate: "2026-04-12",
    completedStages: 6,
    notes: "نموذج في نقطة انتظار رأي العميل بعد التصميم ثلاثي الأبعاد.",
  });
  const projectHotel = await ensureProject({
    clientId: clients[9].id,
    officeId: office2.id,
    projectName: "فندق بلو باي - تجديد اللوبي",
    designType: "تصميم ضيافة",
    areaMeters: "430",
    pricePerMeter: "470",
    projectStatus: "المقايسة على مراحل التنفيذ",
    startDate: "2026-03-15",
    completedStages: 8,
    notes: "نموذج متقدم في الـ workflow: اللوحات التنفيذية جاهزة وجاري إعداد المقايسة.",
  });
  const projectPharmacy = await ensureProject({
    clientId: clients[10].id,
    officeId: office2.id,
    projectName: "صيدلية الحياة - فرع ميامي",
    designType: "تصميم وتجهيز تجاري",
    areaMeters: "120",
    pricePerMeter: "390",
    projectStatus: "التسليم النهائي",
    startDate: "2026-02-20",
    completedStages: 11,
    notes: "نموذج مشروع في نهاية الـ workflow قبل التسليم النهائي.",
  });

  await ensureUser({ name: "مدير النظام", email: "admin@example.com", role: "super_admin" });
  const office1Admin = await ensureUser({ name: "مدير المكتب الأول", email: "office1admin@example.com", role: "office_admin", officeId: office1.id });
  const office2Admin = await ensureUser({ name: "مدير المكتب الثاني", email: "office2admin@example.com", role: "office_admin", officeId: office2.id });
  const office1Designer = await ensureUser({ name: "مصمم داخلي - المكتب الأول", email: "designer1@example.com", role: "designer", officeId: office1.id });
  const office2Designer = await ensureUser({ name: "مصمم داخلي - المكتب الثاني", email: "designer2@example.com", role: "designer", officeId: office2.id });
  await ensureUser({ name: client.name, email: "client@example.com", role: "client", officeId: office1.id, clientId: client.id });

  for (const project of [
    projectVilla,
    projectApartment,
    projectOffice,
    projectKitchen,
    projectFamilyHome,
    projectLinkspace,
    projectCafe,
    projectRoof,
  ]) {
    await seedFullProjectWorkflow({ project, createdBy: office1Admin.id, assignedTo: office1Designer.id });
  }

  for (const project of [projectRestaurant, projectClinic, projectHotel, projectPharmacy]) {
    await seedFullProjectWorkflow({ project, createdBy: office2Admin.id, assignedTo: office2Designer.id });
  }

  console.log("Seed data is ready.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
