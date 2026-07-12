export type GlossaryTerm = {
  id: string;
  names: { en: string; "zh-Hans": string };
  definitions: { en: string; "zh-Hans": string };
};

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: "permanent-residence",
    names: { en: "Permanent residence", "zh-Hans": "永久居留" },
    definitions: {
      en: "A status that generally allows a person to live in a country indefinitely while remaining a citizen of another country. Rights and renewal rules vary.",
      "zh-Hans":
        "通常允许个人在保留其他国家国籍的同时无限期居住于一国的身份。具体权利和续期规则因地而异。",
    },
  },
  {
    id: "residence-permit",
    names: { en: "Residence permit", "zh-Hans": "居留许可" },
    definitions: {
      en: "An authorization to live in a country for a stated purpose and period. It may be temporary or permanent.",
      "zh-Hans": "允许个人因特定目的在一国居住一定期限的许可，可能是临时或永久性质。",
    },
  },
  {
    id: "citizenship-pathway",
    names: { en: "Citizenship pathway", "zh-Hans": "入籍路径" },
    definitions: {
      en: "A possible sequence from a current status toward citizenship. Eligibility usually depends on separate residence, language, conduct, and application rules.",
      "zh-Hans": "从当前身份走向公民身份的可能步骤，通常另受居住年限、语言、品行和申请规则约束。",
    },
  },
  {
    id: "direct-pr",
    names: { en: "Direct permanent residence", "zh-Hans": "直接永久居留" },
    definitions: {
      en: "A pathway whose successful outcome is permanent residence rather than a temporary permit that may later support another application.",
      "zh-Hans": "成功结果直接为永久居留，而不是日后可能支持另一项申请的临时许可。",
    },
  },
  {
    id: "temporary-residence",
    names: { en: "Temporary residence", "zh-Hans": "临时居留" },
    definitions: {
      en: "Permission to live in a country for a limited period, normally tied to stated conditions such as work, study, family, or remote income.",
      "zh-Hans": "在有限期限内居住于一国的许可，通常与工作、学习、家庭或境外收入等条件相关。",
    },
  },
  {
    id: "employer-sponsorship",
    names: { en: "Employer sponsorship", "zh-Hans": "雇主担保" },
    definitions: {
      en: "A process in which an eligible employer supports, nominates, or petitions for a worker under a specific immigration program.",
      "zh-Hans": "符合条件的雇主通过特定移民项目支持、提名或为劳动者提交申请的程序。",
    },
  },
  {
    id: "job-offer",
    names: { en: "Job offer", "zh-Hans": "工作邀请" },
    definitions: {
      en: "An offer of employment from an employer. Immigration programs may impose rules on the employer, occupation, pay, hours, or offer duration.",
      "zh-Hans": "雇主提供的就业机会。移民项目可能对雇主、职业、薪资、工时或聘用期限另有要求。",
    },
  },
  {
    id: "nomination",
    names: { en: "Nomination", "zh-Hans": "提名" },
    definitions: {
      en: "Formal support from an authorized government, region, employer, or other body. A nomination is not necessarily the final immigration approval.",
      "zh-Hans": "由获授权的政府、地区、雇主或其他机构提供的正式支持。获得提名不一定等于最终获批。",
    },
  },
  {
    id: "points-threshold",
    names: { en: "Points threshold", "zh-Hans": "分数门槛" },
    definitions: {
      en: "A minimum score used by a points-based system. Meeting the minimum may permit entry to a pool without guaranteeing selection.",
      "zh-Hans": "积分制度使用的最低分数。达到最低分可能仅允许进入候选池，并不保证获选。",
    },
  },
  {
    id: "proof-of-funds",
    names: { en: "Proof of funds", "zh-Hans": "资金证明" },
    definitions: {
      en: "Evidence that an applicant has accessible money for settlement, study, travel, or living costs. Accepted evidence and required amounts vary.",
      "zh-Hans":
        "证明申请人拥有可用于安家、学习、旅行或生活支出的资金。认可材料和所需金额因项目而异。",
    },
  },
  {
    id: "credential-assessment",
    names: { en: "Credential assessment", "zh-Hans": "学历认证" },
    definitions: {
      en: "An evaluation comparing an education credential with the destination country's standards. It does not itself grant admission, licensing, or immigration status.",
      "zh-Hans": "将教育资历与目的地国家标准进行比较的评估，本身不等于录取、执业许可或移民身份。",
    },
  },
  {
    id: "language-benchmark",
    names: { en: "Language benchmark", "zh-Hans": "语言基准" },
    definitions: {
      en: "A standardized proficiency level used to compare language-test results. The accepted tests and minimum levels depend on the program.",
      "zh-Hans": "用于比较语言考试成绩的标准化能力等级。认可考试和最低等级取决于具体项目。",
    },
  },
  {
    id: "dependent",
    names: { en: "Dependent", "zh-Hans": "随行家属" },
    definitions: {
      en: "A family member who may be included in or linked to an applicant's immigration case. Eligible relationships and rights vary.",
      "zh-Hans": "可被纳入申请人移民申请或与其申请关联的家庭成员。符合条件的关系和权利因项目而异。",
    },
  },
  {
    id: "digital-nomad-visa",
    names: { en: "Digital nomad visa", "zh-Hans": "数字游民签证" },
    definitions: {
      en: "A commonly used label for temporary routes aimed at people working remotely, usually with income from outside the destination country.",
      "zh-Hans": "通常指面向远程工作者的临时路径，其收入一般来自目的地国家以外。",
    },
  },
  {
    id: "remote-work-visa",
    names: { en: "Remote-work visa", "zh-Hans": "远程工作签证" },
    definitions: {
      en: "A temporary authorization associated with remote employment or self-employment. It may differ from local work authorization and may not lead to permanent residence.",
      "zh-Hans": "与远程受雇或自雇相关的临时许可，可能不同于当地工作许可，也不一定通向永久居留。",
    },
  },
  {
    id: "study-to-work-pathway",
    names: { en: "Study-to-work pathway", "zh-Hans": "留学转工作路径" },
    definitions: {
      en: "A sequence in which eligible study may support a later work authorization application. Progression is not automatic unless the rules explicitly say so.",
      "zh-Hans":
        "符合条件的学习经历可能支持后续工作许可申请的路径。除非规则明确规定，否则转换并非自动发生。",
    },
  },
  {
    id: "settlement-pathway",
    names: { en: "Settlement pathway", "zh-Hans": "定居路径" },
    definitions: {
      en: "A route designed for permanent residence or one that may support a separate permanent-residence application after meeting additional rules.",
      "zh-Hans": "以永久居留为目标，或在满足额外规则后可能支持另行申请永久居留的路径。",
    },
  },
  {
    id: "processing-time",
    names: { en: "Processing time", "zh-Hans": "审理时间" },
    definitions: {
      en: "The time an authority takes to decide an application. Published figures are usually estimates or recent-case statistics, not guarantees.",
      "zh-Hans": "主管机关作出申请决定所需的时间。公布数字通常是估算或近期案例统计，并非保证。",
    },
  },
  {
    id: "official-source",
    names: { en: "Official source", "zh-Hans": "官方来源" },
    definitions: {
      en: "A government, public authority, or officially designated program page used as evidence for a pathway requirement or status.",
      "zh-Hans": "用于证明路径要求或状态的政府、公共机关或获官方指定的项目页面。",
    },
  },
  {
    id: "last-checked",
    names: { en: "Last checked", "zh-Hans": "上次检查" },
    definitions: {
      en: "The date when a source or record was most recently reviewed. It is a freshness signal, not a promise that no change occurred afterward.",
      "zh-Hans": "来源或记录最近一次审核的日期，是时效性信号，并不保证此后没有发生变化。",
    },
  },
];
