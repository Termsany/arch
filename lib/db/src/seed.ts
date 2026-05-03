import { and, eq } from "drizzle-orm";
import { db, pool } from ".";
import {
  boqCategoriesTable,
  clientsTable,
  officesTable,
  projectStagesTable,
  projectsTable,
  subscriptionPlansTable,
  usersTable,
} from "./schema";

const passwordHash = "$2b$12$UbxQPhHR.nNqOddA/bq.se4yV4dZ54qlWB84qs4WUcH6yZS5nQCui";
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

async function main() {
  const plan = await ensurePlan();
  const office1 = await ensureOffice("مكتب التصميم الأول", "مدير المكتب الأول", "office1@example.com", plan.id);
  const office2 = await ensureOffice("مكتب التصميم الثاني", "مدير المكتب الثاني", "office2@example.com", plan.id);
  await ensureBoqCategories(office1.id);
  await ensureBoqCategories(office2.id);
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
  ];

  await ensureProject({
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
  await ensureProject({
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
  await ensureProject({
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
  await ensureProject({
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
  await ensureProject({
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
  await ensureProject({
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

  await ensureUser({ name: "مدير النظام", email: "admin@example.com", role: "super_admin" });
  await ensureUser({ name: "مدير المكتب الأول", email: "office1admin@example.com", role: "office_admin", officeId: office1.id });
  await ensureUser({ name: "مدير المكتب الثاني", email: "office2admin@example.com", role: "office_admin", officeId: office2.id });
  await ensureUser({ name: client.name, email: "client@example.com", role: "client", officeId: office1.id, clientId: client.id });

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
