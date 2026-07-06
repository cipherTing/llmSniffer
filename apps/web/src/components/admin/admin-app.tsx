"use client";

import { App as AntApp, Button, Checkbox, ConfigProvider, Drawer, Form, Input, Modal, Select, Table, Tag, theme as antTheme, type FormListFieldData, type TableColumnsType } from "antd";
import { Globe2, House, LogOut, Pencil, Plus, Shield, Trash2, UsersRound } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import { apiRequest } from "@/lib/api-client";
import { useMounted } from "@/lib/use-mounted";
import type {
  AdminResponse,
  AdminUser,
  AdminsResponse,
  BootstrapStatusResponse,
  MonitoredSite,
  RequestTemplate,
  RequestTemplatesResponse,
  SitesResponse,
} from "@/lib/admin-types";
import type { ProviderTag, SponsorTier } from "@/lib/monitoring-types";
import { ThemeToggle } from "../dashboard/theme-toggle";

type AdminMode = "loading" | "bootstrap" | "login" | "dashboard";
type AdminSection = "sites" | "admins";

type SiteFormValues = {
  name: string;
  url: string;
  sponsorTier: SponsorTier;
  monitorIntervalSeconds: number;
  providers: ProviderTag[];
  probes: { id?: string; requestTemplateId: string; baseUrl: string; apiKey?: string; modelName: string; enabled: boolean }[];
};

const providerOptions: ProviderTag[] = ["OpenAI", "Anthropic", "Gemini"];
const monitorIntervalOptions = [60, 150, 300, 600, 900, 1800, 3600];

const adminProviderChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  minHeight: 22,
  border: "1px solid #d1d9e6",
  borderRadius: 999,
  background: "#ffffff",
  color: "#0b0f19",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1,
  padding: "0 8px",
};

const adminProbeChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 22,
  maxWidth: "100%",
  border: "1px solid #d9e3ef",
  borderRadius: 999,
  background: "#f8fafc",
  color: "#334155",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1,
  padding: "0 8px",
};

export function AdminApp() {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <ConfigProvider
      getPopupContainer={getAdminPopupContainer}
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorBgContainer: "var(--surface)",
          colorBgElevated: "var(--surface)",
          colorBorderSecondary: "var(--row-border)",
          colorText: "var(--text)",
          colorTextSecondary: "var(--muted)",
          borderRadius: 8,
          fontFamily: "var(--font-sans)",
        },
        components: {
          Empty: {
            colorTextDescription: "var(--muted)",
          },
          Table: {
            headerBg: "var(--table-head)",
            headerColor: "var(--muted)",
            rowHoverBg: "var(--surface-hover)",
          },
        },
      }}
      renderEmpty={() => <div className="llms-empty-state">暂无数据</div>}
    >
      <AntApp message={{ maxCount: 3 }}>
        <AdminAppContent />
      </AntApp>
    </ConfigProvider>
  );
}

function AdminAppContent() {
  const { message: toast } = AntApp.useApp();
  const [mode, setMode] = useState<AdminMode>("loading");
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [entryReloadKey, setEntryReloadKey] = useState(0);

  useEffect(() => {
    async function loadEntryState() {
      setMode("loading");
      try {
        const bootstrap = await apiRequest<BootstrapStatusResponse>("/api/admin/bootstrap/status");
        if (!bootstrap.initialized) {
          setMode("bootstrap");
          return;
        }

        try {
          const me = await apiRequest<AdminResponse>("/api/admin/auth/me");
          setCurrentAdmin(me.admin);
          setMode("dashboard");
        } catch {
          setCurrentAdmin(null);
          setMode("login");
        }
      } catch (requestError) {
        void toast.error(requestError instanceof Error ? requestError.message : "无法连接管理 API");
        setMode("login");
      }
    }

    void loadEntryState();
  }, [entryReloadKey, toast]);

  async function handleAuthed(admin: AdminUser) {
    setCurrentAdmin(admin);
    setMode("dashboard");
  }

  return (
    <main className="admin-page min-h-screen bg-[var(--background)] text-[var(--text)]">
      {mode === "loading" ? <CenteredState title="正在检查管理状态" /> : null}
      {mode === "bootstrap" ? <BootstrapPanel onAuthed={handleAuthed} /> : null}
      {mode === "login" ? <LoginPanel onAuthed={handleAuthed} /> : null}
      {mode === "dashboard" && currentAdmin ? <AdminDashboard admin={currentAdmin} onLogout={() => setEntryReloadKey((key) => key + 1)} /> : null}
    </main>
  );
}

function BootstrapPanel({ onAuthed }: { onAuthed: (admin: AdminUser) => void }) {
  const { message: toast } = AntApp.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  async function submit(values: { username: string; password: string; bootstrapToken: string }) {
    setSubmitting(true);
    try {
      const response = await apiRequest<AdminResponse>("/api/admin/bootstrap", {
        method: "POST",
        body: JSON.stringify(values),
      });
      onAuthed(response.admin);
    } catch (requestError) {
      void toast.error(requestError instanceof Error ? requestError.message : "初始化失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="初始化系统管理员" description="第一次进入管理页时创建系统管理员。初始化口令来自部署环境变量。">
      <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
        <Form.Item label="管理员账号" name="username" rules={[{ required: true, message: "请输入管理员账号" }, { min: 3, message: "至少 3 个字符" }]}> 
          <Input autoComplete="username" />
        </Form.Item>
        <Form.Item label="管理员密码" name="password" rules={[{ required: true, message: "请输入管理员密码" }, { min: 8, message: "至少 8 个字符" }]}> 
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item label="初始化口令" name="bootstrapToken" rules={[{ required: true, message: "请输入初始化口令" }]}> 
          <Input.Password autoComplete="off" />
        </Form.Item>
        <Button block htmlType="submit" loading={submitting} type="primary">
          完成初始化
        </Button>
      </Form>
    </AuthShell>
  );
}

function LoginPanel({ onAuthed }: { onAuthed: (admin: AdminUser) => void }) {
  const { message: toast } = AntApp.useApp();
  const [submitting, setSubmitting] = useState(false);

  async function submit(values: { username: string; password: string }) {
    setSubmitting(true);
    try {
      const response = await apiRequest<AdminResponse>("/api/admin/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      onAuthed(response.admin);
    } catch (requestError) {
      void toast.error(requestError instanceof Error ? requestError.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="管理页登录" description="登录后 7 天内免登录。">
      <Form layout="vertical" onFinish={submit} requiredMark={false}>
        <Form.Item label="管理员账号" name="username" rules={[{ required: true, message: "请输入管理员账号" }]}> 
          <Input autoComplete="username" />
        </Form.Item>
        <Form.Item label="管理员密码" name="password" rules={[{ required: true, message: "请输入管理员密码" }]}> 
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button block htmlType="submit" loading={submitting} type="primary">
          登录
        </Button>
      </Form>
    </AuthShell>
  );
}

function AdminDashboard({ admin, onLogout }: { admin: AdminUser; onLogout: () => void }) {
  const [section, setSection] = useState<AdminSection>("sites");

  async function logout() {
    await apiRequest("/api/admin/auth/logout", { method: "POST" });
    onLogout();
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[208px_minmax(0,1fr)]">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-brand px-2">
            <div className="admin-brand-mark">L</div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-tight">LLMSniffer</h1>
              <p className="mt-0.5 text-xs text-[var(--muted)]">管理后台</p>
            </div>
          </div>
          <nav className="admin-nav">
            <AdminNavItem active={section === "sites"} icon={<Globe2 size={15} />} label="收录网站" onClick={() => setSection("sites")} />
            {admin.role === "system" ? (
              <AdminNavItem active={section === "admins"} icon={<UsersRound size={15} />} label="管理员" onClick={() => setSection("admins")} />
            ) : null}
          </nav>
        </div>
        <div className="admin-sidebar-footer">
          <Button block href="/" icon={<House size={14} />}>
            返回首页
          </Button>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{admin.username}</div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">{admin.role === "system" ? "系统管理员" : "管理员"}</div>
            </div>
            <ThemeToggle />
          </div>
          <Button block icon={<LogOut size={14} />} onClick={logout}>
            退出登录
          </Button>
        </div>
      </aside>
      <section className="admin-workspace min-w-0">
        {section === "sites" ? <SitesPanel /> : null}
        {section === "admins" && admin.role === "system" ? <AdminsPanel currentAdmin={admin} /> : null}
      </section>
    </div>
  );
}

function AdminNavItem({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`admin-nav-item ${active ? "admin-nav-item-active" : ""}`} onClick={onClick} type="button">
      <span className="admin-nav-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function AdminSectionHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="admin-section-header">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
      </div>
      {action ? <div className="admin-section-action">{action}</div> : null}
    </div>
  );
}

function SitesPanel() {
  const { message: toast } = AntApp.useApp();
  const [sites, setSites] = useState<MonitoredSite[]>([]);
  const [templates, setTemplates] = useState<RequestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<MonitoredSite | null>(null);
  const [drawerInstanceKey, setDrawerInstanceKey] = useState(0);
  const [sitesReloadKey, setSitesReloadKey] = useState(0);

  useEffect(() => {
    async function loadSites() {
      setLoading(true);
      try {
        const [sitesResponse, templatesResponse] = await Promise.all([
          apiRequest<SitesResponse>("/api/admin/sites"),
          apiRequest<RequestTemplatesResponse>("/api/admin/request-templates"),
        ]);
        setSites(sitesResponse.sites);
        setTemplates(templatesResponse.templates);
      } catch (requestError) {
        void toast.error(requestError instanceof Error ? requestError.message : "加载收录网站失败");
      } finally {
        setLoading(false);
      }
    }

    void loadSites();
  }, [sitesReloadKey, toast]);

  function openSiteDrawer(site: MonitoredSite | null) {
    setEditingSite(site);
    setDrawerInstanceKey((key) => key + 1);
    setDrawerOpen(true);
  }

  const columns: TableColumnsType<MonitoredSite> = [
    { title: "名称", dataIndex: "name", width: "18%" },
    { title: "官网", dataIndex: "domain", width: "18%", render: (_, site) => <a href={site.url} target="_blank" rel="noreferrer">{site.domain}</a> },
    { title: "赞助", dataIndex: "sponsorTier", width: "12%", render: (tier: SponsorTier) => (tier === "premium" ? "高级赞助商" : "普通赞助商") },
    { title: "频率", dataIndex: "monitorIntervalSeconds", width: "10%", render: (seconds: number) => formatDuration(seconds) },
    { title: "厂商", dataIndex: "providers", width: "16%", render: (providers: ProviderTag[]) => <ProviderTags providers={providers} /> },
    { title: "请求探针", dataIndex: "probes", render: (probes: MonitoredSite["probes"]) => <ProbeList probes={probes} templates={templates} /> },
    {
      title: "操作",
      width: 110,
      render: (_, site) => (
        <Button icon={<Pencil size={13} />} onClick={() => openSiteDrawer(site)} size="small">
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      <AdminSectionHeader
        title="收录网站"
        description="管理首页展示的第三方 AI 中转站、请求探针和赞助信息。"
        action={(
          <Button icon={<Plus size={14} />} onClick={() => openSiteDrawer(null)} type="primary">
            新增网站
          </Button>
        )}
      />
      <div className="admin-table-shell">
        <Table columns={columns} dataSource={sites} loading={{ spinning: loading, description: "正在加载收录网站" }} pagination={false} rowKey="id" size="small" tableLayout="fixed" />
      </div>
      <SiteDrawer
        key={drawerInstanceKey}
        site={editingSite}
        open={drawerOpen}
        templates={templates}
        onClose={() => { setDrawerOpen(false); setEditingSite(null); }}
        onCreated={() => {
          setDrawerOpen(false);
          setEditingSite(null);
          setSitesReloadKey((key) => key + 1);
        }}
      />
    </div>
  );
}

function ProviderTags({ providers }: { providers: ProviderTag[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {providers.map((provider) => (
        <span key={provider} style={adminProviderChipStyle}>
          <ProviderLogo provider={provider} />
          {provider}
        </span>
      ))}
    </div>
  );
}

function ProbeList({ probes, templates }: { probes: MonitoredSite["probes"]; templates: RequestTemplate[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {probes.map((probe) => (
        <span key={probe.id} style={adminProbeChipStyle}>{templateName(templates, probe.requestTemplateId)}</span>
      ))}
    </div>
  );
}

function templateName(templates: RequestTemplate[], templateId: string) {
  return templates.find((template) => template.id === templateId)?.name ?? templateId;
}

function ProviderLogo({ provider }: { provider: ProviderTag }) {
  if (provider === "OpenAI") {
    return (
      <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 320 320">
        <path
          d="M297.06 130.97c7.26-21.79 4.76-45.66-6.85-65.48-17.46-30.4-52.56-46.04-86.84-38.68-15.25-17.18-37.16-26.95-60.13-26.81-35.04-.08-66.13 22.48-76.91 55.82-22.51 4.61-41.94 18.7-53.31 38.67-17.59 30.32-13.58 68.54 9.92 94.54-7.26 21.79-4.76 45.66 6.85 65.48 17.46 30.4 52.56 46.04 86.84 38.68 15.24 17.18 37.16 26.95 60.13 26.8 35.06.09 66.16-22.49 76.94-55.86 22.51-4.61 41.94-18.7 53.31-38.67 17.57-30.32 13.55-68.51-9.94-94.51zm-120.28 168.11c-14.03.02-27.62-4.89-38.39-13.88.49-.26 1.34-.73 1.89-1.07l63.72-36.8c3.26-1.85 5.26-5.32 5.24-9.07v-89.83l26.93 15.55c.29.14.48.42.52.74v74.39c-.04 33.08-26.83 59.9-59.91 59.97zm-128.84-55.03c-7.03-12.14-9.56-26.37-7.15-40.18.47.28 1.3.79 1.89 1.13l63.72 36.8c3.23 1.89 7.23 1.89 10.47 0l77.79-44.92v31.1c.02.32-.13.63-.38.83l-64.41 37.19c-28.69 16.52-65.33 6.7-81.92-21.95zm-16.77-139.09c7-12.16 18.05-21.46 31.21-26.29 0 .55-.03 1.52-.03 2.2v73.61c-.02 3.74 1.98 7.21 5.23 9.06l77.79 44.91-26.93 15.55c-.27.18-.61.21-.91.08l-64.42-37.22c-28.63-16.58-38.45-53.21-21.95-81.89zm221.26 51.49-77.79-44.92 26.93-15.54c.27-.18.61-.21.91-.08l64.42 37.19c28.68 16.57 38.51 53.26 21.94 81.94-7.01 12.14-18.05 21.44-31.2 26.28v-75.81c.03-3.74-1.96-7.2-5.2-9.06zm26.8-40.34c-.47-.29-1.3-.79-1.89-1.13l-63.72-36.8c-3.23-1.89-7.23-1.89-10.47 0l-77.79 44.92v-31.1c-.02-.32.13-.63.38-.83l64.41-37.16c28.69-16.55 65.37-6.7 81.91 22 6.99 12.12 9.52 26.31 7.15 40.1zm-168.51 55.43-26.94-15.55c-.29-.14-.48-.42-.52-.74v-74.39c.02-33.12 26.89-59.96 60.01-59.94 14.01 0 27.57 4.92 38.34 13.88-.49.26-1.33.73-1.89 1.07l-63.72 36.8c-3.26 1.85-5.26 5.31-5.24 9.06l-.04 89.79zm14.63-31.54 34.65-20.01 34.65 20v40.01l-34.65 20-34.65-20z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (provider === "Gemini") {
    return <span className="text-[11px] font-bold text-sky-700">G</span>;
  }

  return <span className="text-[11px] font-bold text-stone-900">A</span>;
}

function defaultProbe(templates: RequestTemplate[]) {
  return {
    requestTemplateId: templates[0]?.id ?? "",
    baseUrl: "",
    apiKey: "",
    modelName: "",
    enabled: true,
  };
}

function defaultSiteFormValues(templates: RequestTemplate[]): SiteFormValues {
  return {
    sponsorTier: "standard",
    monitorIntervalSeconds: 300,
    providers: ["OpenAI"],
    probes: [defaultProbe(templates)],
  } as SiteFormValues;
}

function siteToFormValues(site: MonitoredSite): SiteFormValues {
  return {
    name: site.name,
    url: site.url,
    sponsorTier: site.sponsorTier,
    monitorIntervalSeconds: site.monitorIntervalSeconds,
    providers: site.providers,
    probes: site.probes.map((probe) => ({
      id: probe.id,
      requestTemplateId: probe.requestTemplateId,
      baseUrl: probe.baseUrl,
      apiKey: "",
      modelName: probe.modelName,
      enabled: probe.enabled,
    })),
  };
}

function SiteDrawer({ site, open, templates, onClose, onCreated }: { site: MonitoredSite | null; open: boolean; templates: RequestTemplate[]; onClose: () => void; onCreated: () => void }) {
  const { message: toast } = AntApp.useApp();
  const [form] = Form.useForm<SiteFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const deleteConfirmPhrase = site ? `我要删除 ${site.name}` : "";

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue(site ? siteToFormValues(site) : defaultSiteFormValues(templates));
  }, [form, open, site, templates]);

  async function submit(values: SiteFormValues) {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        probes: values.probes.map((probe) => ({
          ...probe,
          apiKey: probe.apiKey?.trim() ? probe.apiKey.trim() : undefined,
        })),
      };

      await apiRequest(site ? `/api/admin/sites/${site.id}` : "/api/admin/sites", {
        method: site ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      form.resetFields();
      onCreated();
    } catch (requestError) {
      void toast.error(requestError instanceof Error ? requestError.message : site ? "编辑网站失败" : "新增网站失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitFromForm() {
    const values = await form.validateFields();
    await submit(values);
  }

  async function deleteSite() {
    if (!site) return;

    setDeleting(true);
    try {
      await apiRequest(`/api/admin/sites/${site.id}`, { method: "DELETE" });
      onCreated();
    } catch (requestError) {
      void toast.error(requestError instanceof Error ? requestError.message : "删除网站失败");
    } finally {
      setDeleting(false);
    }
  }

  function openDeleteConfirm() {
    setDeleteConfirmText("");
    setDeleteConfirmOpen(true);
  }

  return (
    <Drawer className="admin-drawer" destroyOnHidden maskClosable onClose={onClose} open={open} size="large" title={site ? "编辑收录网站" : "新增收录网站"}>
      <Modal
        cancelText="取消"
        confirmLoading={deleting}
        maskClosable
        okButtonProps={{ danger: true, disabled: deleteConfirmText !== deleteConfirmPhrase }}
        okText="删除"
        onCancel={() => setDeleteConfirmOpen(false)}
        onOk={() => void deleteSite()}
        open={deleteConfirmOpen}
        title={site ? `删除 ${site.name}？` : "删除网站？"}
      >
        {site ? (
          <DeleteSiteConfirm expected={deleteConfirmPhrase} siteName={site.name} value={deleteConfirmText} onChange={setDeleteConfirmText} />
        ) : null}
      </Modal>
      <Form
        form={form}
        initialValues={defaultSiteFormValues(templates)}
        layout="vertical"
        onFinish={submit}
        requiredMark={false}
      >
        <Form.Item label="名字" name="name" rules={[{ required: true, message: "请输入名字" }, { max: 80, message: "最多 80 个字符" }]}> 
          <Input placeholder={site?.name ?? "例如 YunDou"} />
        </Form.Item>
        <Form.Item label="官网地址" name="url" rules={[{ required: true, message: "请输入官网地址" }, { type: "url", message: "请输入 http 或 https 地址" }]}> 
          <Input placeholder={site?.url ?? "https://example.com"} />
        </Form.Item>
        <div className="grid gap-3 md:grid-cols-2">
          <Form.Item label="赞助商等级" name="sponsorTier" rules={[{ required: true }]}> 
            <Select
              options={[
                { value: "standard", label: "普通赞助商" },
                { value: "premium", label: "高级赞助商" },
              ]}
            />
          </Form.Item>
          <Form.Item label="监控频率" name="monitorIntervalSeconds" rules={[{ required: true }]}> 
            <Select options={monitorIntervalOptions.map((seconds) => ({ value: seconds, label: formatDuration(seconds) }))} />
          </Form.Item>
        </div>
        <Form.Item label="接入 AI 厂家" name="providers" rules={[{ required: true, message: "至少选择一个厂商" }]}> 
          <Select mode="multiple" options={providerOptions.map((provider) => ({ value: provider, label: provider }))} />
        </Form.Item>

        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">请求探针</div>
          <div className="text-xs text-[var(--muted)]">默认 1 个，最多 5 个</div>
        </div>
        <Form.List name="probes">
          {(fields: FormListFieldData[], { add, remove }: { add: (defaultValue?: unknown) => void; remove: (index: number | number[]) => void }) => (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div className="rounded-md border border-[var(--border)] bg-[var(--table-head)] p-3" key={field.key}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--muted)]">请求探针 {index + 1}</span>
                    {fields.length > 1 ? (
                      <Button danger icon={<Trash2 size={13} />} onClick={() => remove(field.name)} size="small" type="text">
                        删除
                      </Button>
                    ) : null}
                  </div>
                  <Form.Item label="请求模板" name={[field.name, "requestTemplateId"]} rules={[{ required: true, message: "请选择请求模板" }]}> 
                    <Select options={templates.map((template) => ({ value: template.id, label: template.name }))} />
                  </Form.Item>
                  <Form.Item hidden name={[field.name, "id"]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Base URL" name={[field.name, "baseUrl"]} rules={[{ required: true, message: "请输入 Base URL" }, { type: "url", message: "请输入 http 或 https 地址" }]}> 
                    <Input placeholder={site?.probes[index]?.baseUrl ?? "https://api.example.com/v1"} />
                  </Form.Item>
                  <Form.Item
                    extra={site ? "留空则保持现有密钥" : undefined}
                    label="密钥"
                    name={[field.name, "apiKey"]}
                    rules={[
                      {
                        validator: (_, value: string | undefined) => {
                          const probeId = form.getFieldValue(["probes", field.name, "id"]);
                          if (probeId || value?.trim()) return Promise.resolve();
                          return Promise.reject(new Error("请输入密钥"));
                        },
                      },
                    ]}
                  > 
                    <Input.Password placeholder={site?.probes[index]?.apiKeyMasked ? `已保存：${site.probes[index].apiKeyMasked}` : "sk-..."} autoComplete="off" />
                  </Form.Item>
                  <Form.Item label="模型名字" name={[field.name, "modelName"]} rules={[{ required: true, message: "请输入模型名字" }, { max: 120, message: "最多 120 个字符" }]}> 
                    <Input placeholder={site?.probes[index]?.modelName ?? "gpt-4o-mini"} />
                  </Form.Item>
                  <Form.Item name={[field.name, "enabled"]} valuePropName="checked">
                    <Checkbox>启用探针</Checkbox>
                  </Form.Item>
                </div>
              ))}
              <Button disabled={fields.length >= 5} onClick={() => add(defaultProbe(templates))} type="dashed" block>
                新增请求探针
              </Button>
            </div>
          )}
        </Form.List>

        <div className="mt-5 flex items-center justify-between gap-2">
          <div>
            {site ? (
              <Button danger icon={<Trash2 size={13} />} loading={deleting} onClick={openDeleteConfirm}>
                删除网站
              </Button>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>取消</Button>
            <Button loading={submitting} onClick={() => void submitFromForm()} type="primary">
              {site ? "保存修改" : "确认新增"}
            </Button>
          </div>
        </div>
      </Form>
    </Drawer>
  );
}

function DeleteSiteConfirm({ siteName, expected, value, onChange }: { siteName: string; expected: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-3">
      <p>删除后不可恢复，也会从首页监控列表移除。</p>
      <p>请输入 <span className="font-semibold">{expected}</span> 确认删除。</p>
      <Input autoComplete="off" onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} placeholder={`我要删除 ${siteName}`} value={value} />
    </div>
  );
}

function AdminsPanel({ currentAdmin }: { currentAdmin: AdminUser }) {
  const { message: toast, modal } = AntApp.useApp();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createForm] = Form.useForm<{ username: string; password: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [adminsReloadKey, setAdminsReloadKey] = useState(0);

  useEffect(() => {
    async function loadAdmins() {
      setLoading(true);
      try {
        const response = await apiRequest<AdminsResponse>("/api/admin/users");
        setAdmins(response.admins);
      } catch (requestError) {
        void toast.error(requestError instanceof Error ? requestError.message : "加载管理员失败");
      } finally {
        setLoading(false);
      }
    }

    void loadAdmins();
  }, [adminsReloadKey, toast]);

  async function deleteAdmin(admin: AdminUser) {
    await apiRequest(`/api/admin/users/${admin.id}`, { method: "DELETE" });
    setAdminsReloadKey((key) => key + 1);
  }

  async function createAdmin(values: { username: string; password: string }) {
    setSubmitting(true);
    try {
      await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(values),
      });
      createForm.resetFields();
      setAdminsReloadKey((key) => key + 1);
    } catch (requestError) {
      void toast.error(requestError instanceof Error ? requestError.message : "新增管理员失败");
    } finally {
      setSubmitting(false);
    }
  }

  const columns: TableColumnsType<AdminUser> = [
    { title: "账号", dataIndex: "username" },
    { title: "角色", dataIndex: "role", render: (role: AdminUser["role"]) => (role === "system" ? <Tag color="gold">系统管理员</Tag> : <Tag color="blue">管理员</Tag>) },
    {
      title: "操作",
      width: 120,
      render: (_, admin) =>
        admin.role === "admin" && admin.id !== currentAdmin.id ? (
          <Button
            danger
            icon={<Trash2 size={13} />}
            onClick={() => {
              modal.confirm({
                title: `删除管理员 ${admin.username}？`,
                content: "删除后该管理员的登录态会立即失效。",
                maskClosable: true,
                okText: "删除",
                okButtonProps: { danger: true },
                cancelText: "取消",
                onOk: () => deleteAdmin(admin),
              });
            }}
            size="small"
          >
            删除
          </Button>
        ) : (
          <span className="text-xs text-[var(--muted)]">不可删除</span>
        ),
    },
  ];

  return (
    <div>
      <AdminSectionHeader title="管理员" description="系统管理员可以新增和删除普通管理员。" />
      <Form className="admin-inline-form" form={createForm} layout="inline" onFinish={createAdmin} requiredMark={false}>
        <Form.Item label="账号" name="username" rules={[{ required: true, message: "请输入账号" }, { min: 3, message: "至少 3 个字符" }]}> 
          <Input autoComplete="off" placeholder="普通管理员账号" />
        </Form.Item>
        <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }, { min: 8, message: "至少 8 个字符" }]}> 
          <Input.Password autoComplete="new-password" placeholder="至少 8 个字符" />
        </Form.Item>
        <Form.Item>
          <Button htmlType="submit" icon={<Shield size={14} />} loading={submitting} type="primary">
            新增管理员
          </Button>
        </Form.Item>
      </Form>
      <div className="admin-table-shell">
        <Table columns={columns} dataSource={admins} loading={{ spinning: loading, description: "正在加载管理员" }} pagination={false} rowKey="id" size="small" />
      </div>
    </div>
  );
}

function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="admin-panel w-full max-w-sm p-5">
        <div className="mb-5">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
        </div>
        {children}
      </section>
    </div>
  );
}

function CenteredState({ title }: { title: string }) {
  return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">{title}</div>;
}

function getAdminPopupContainer(triggerNode?: HTMLElement) {
  return triggerNode?.closest(".admin-page") ?? document.body;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m${seconds > 0 ? `${seconds}s` : ""}`;
}
