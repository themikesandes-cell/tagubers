import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleUserRound,
  Eye,
  FileText,
  Filter,
  Home,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
  X,
  WalletCards,
} from 'lucide-react';
import './styles.css';

type Role = 'ADMIN' | 'COLABORADOR';

type Status =
  | 'RASCUNHO'
  | 'AGUARDANDO'
  | 'APROVADO'
  | 'REPROVADO';

type User = {
  id: string;
  nome: string;
  email: string;
  cargo?: string | null;
  perfil: Role;
  fotoUrl?: string | null;
  ativo?: boolean;
};

type Cliente = {
  id: string;
  nome: string;
  codigo?: string | null;
  ativo?: boolean;
};

type Despesa = {
  id?: string;
  tipo: 'IDA' | 'VOLTA' | 'OUTRO';
  categoria: string;
  valor: number;
  comprovanteUrl?: string | null;
};

type Visita = {
  id: string;
  dataVisita: string;
  observacao?: string | null;
  status: Status;
  motivoReprovacao?: string | null;
  total: number;
  cliente: Cliente;
  colaborador: User;
  despesas: Despesa[];
};

const API =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFmt = new Intl.DateTimeFormat('pt-BR');

async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('cv_token');

  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const contentType =
    response.headers.get('content-type') || '';

  let data: any = {};

  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => '');
    data = text ? { message: text } : {};
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.message ||
        'Não foi possível concluir a operação.'
    );
  }

  return data;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFmt.format(date);
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<ProtectedApp />} />
    </Routes>
  );
}

function ProtectedApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cv_token');

    if (!token) {
      setLoading(false);
      return;
    }

    api('/me')
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem('cv_token');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="splash">
        <Activity size={22} />
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Shell user={user} setUser={setUser} />;
}

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !senha.trim()) {
      setError('Informe seu e-mail e sua senha.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          senha,
        }),
      });

      if (!data?.token) {
        throw new Error(
          'O servidor não retornou um token de acesso.'
        );
      }

      localStorage.setItem('cv_token', data.token);

      navigate('/', {
        replace: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao entrar.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark">
          <WalletCards size={22} />
        </div>

        <div className="eyebrow">CONTROLE INTERNO</div>

        <h1>
          Controle de Visitas <span>& Uber</span>
        </h1>

        <p>
          Prestação de deslocamentos simples, rápida e organizada.
        </p>

        <form onSubmit={submit} className="stack">
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              autoComplete="email"
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          <button
            className="primary full"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Entrando...' : 'Entrar'}
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="link-button"
            onClick={() =>
              alert(
                'A redefinição de senha deve ser habilitada pelo e-mail no backend.'
              )
            }
          >
            Esqueci minha senha
          </button>
        </form>

        <div className="hint">
          Ambiente MVP · acesso administrado pela empresa
        </div>
      </div>
    </div>
  );
}

function Shell({
  user,
  setUser,
}: {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menu =
    user.perfil === 'ADMIN'
      ? ([
          ['/', 'Dashboard', Home],
          ['/visitas', 'Visitas', FileText],
          ['/clientes', 'Clientes', Users],
          ['/usuarios', 'Usuários', UserPlus],
          ['/relatorios', 'Relatórios', BarChart3],
          ['/perfil', 'Meu perfil', CircleUserRound],
        ] as const)
      : ([
          ['/', 'Início', Home],
          ['/nova-visita', 'Nova visita', Plus],
          ['/minhas-visitas', 'Minhas visitas', FileText],
          ['/perfil', 'Meu perfil', CircleUserRound],
        ] as const);

  const logout = () => {
    localStorage.removeItem('cv_token');

    setUser(null);

    navigate('/login', {
      replace: true,
    });
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${
          mobileOpen ? 'open' : ''
        }`}
      >
        <div className="brand">
          <div className="brand-mark small">
            <WalletCards size={18} />
          </div>

          <div>
            <strong>Controle</strong>
            <span>Visitas & Uber</span>
          </div>
        </div>

        <nav>
          {menu.map(([path, label, Icon]) => (
            <button
              key={path}
              type="button"
              className={
                isActive(path)
                  ? 'nav active'
                  : 'nav'
              }
              onClick={() => {
                navigate(path);
                setMobileOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="nav"
            onClick={logout}
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="scrim"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div>
            <div className="eyebrow">
              {user.perfil === 'ADMIN'
                ? 'ADMINISTRAÇÃO'
                : 'ÁREA DO COLABORADOR'}
            </div>

            <div className="top-title">
              Controle de Visitas & Uber
            </div>
          </div>

          <div className="top-user">
            <img
              src={avatarUrl(user)}
              alt={user.nome}
            />

            <div>
              <strong>{user.nome}</strong>
              <span>
                {user.cargo ||
                  (user.perfil === 'ADMIN'
                    ? 'Administrador'
                    : 'Colaborador')}
              </span>
            </div>
          </div>
        </header>

        <div className="content">
          <Routes>
            <Route
              path="/"
              element={
                user.perfil === 'ADMIN' ? (
                  <AdminDashboard />
                ) : (
                  <CollaboratorHome user={user} />
                )
              }
            />

            <Route
              path="/nova-visita"
              element={<NewVisit />}
            />

            <Route
              path="/minhas-visitas"
              element={<VisitList mine />}
            />

            <Route
              path="/visitas"
              element={<VisitList />}
            />

            <Route
              path="/visita/:id"
              element={<VisitDetail user={user} />}
            />

            <Route
              path="/clientes"
              element={<Clients />}
            />

            <Route
              path="/usuarios"
              element={<UsersAdmin />}
            />

            <Route
              path="/relatorios"
              element={<Reports />}
            />

            <Route
              path="/perfil"
              element={
                <Profile
                  user={user}
                  setUser={setUser}
                />
              }
            />

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function avatarUrl(user: User) {
  if (user.fotoUrl) {
    const base = API.replace(/\/api\/?$/, '');

    return `${base}${user.fotoUrl}`;
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user.nome
  )}&background=f1f1f3&color=111114&bold=true`;
}

function StatusPill({
  status,
}: {
  status: Status;
}) {
  const labels: Record<Status, string> = {
    RASCUNHO: 'Rascunho',
    AGUARDANDO: 'Aguardando',
    APROVADO: 'Aprovado',
    REPROVADO: 'Reprovado',
  };

  return (
    <span
      className={`pill ${status.toLowerCase()}`}
    >
      <span className="dot" />
      {labels[status]}
    </span>
  );
}

function CollaboratorHome({
  user,
}: {
  user: User;
}) {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/visitas')
      .then(setVisitas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const month = new Date();

  const monthVisits = visitas.filter((v) => {
    const date = new Date(v.dataVisita);

    return (
      date.getMonth() === month.getMonth() &&
      date.getFullYear() === month.getFullYear()
    );
  });

  const total = monthVisits.reduce(
    (sum, v) => sum + Number(v.total || 0),
    0
  );

  return (
    <div className="page stack gap-lg">
      <div className="hero">
        <div>
          <div className="eyebrow">SEU RESUMO</div>

          <h2>
            Olá, {user.nome.split(' ')[0]}.
          </h2>

          <p>
            Registre suas visitas e mantenha os
            comprovantes organizados.
          </p>
        </div>

        <a
          className="primary"
          href="/nova-visita"
        >
          <Plus size={17} />
          Nova visita
        </a>
      </div>

      <div className="grid-4">
        <Metric
          label="Visitas no mês"
          value={String(monthVisits.length)}
          icon={<FileText />}
        />

        <Metric
          label="Total gasto"
          value={money.format(total)}
          icon={<WalletCards />}
        />

        <Metric
          label="Aguardando"
          value={String(
            monthVisits.filter(
              (v) => v.status === 'AGUARDANDO'
            ).length
          )}
          icon={<Activity />}
        />

        <Metric
          label="Aprovadas"
          value={String(
            monthVisits.filter(
              (v) => v.status === 'APROVADO'
            ).length
          )}
          icon={<Check />}
        />
      </div>

      <section className="card">
        <SectionHead
          title="Últimas visitas"
          action={
            <a
              className="link-button"
              href="/minhas-visitas"
            >
              Ver todas
            </a>
          }
        />

        {loading ? (
          <div className="empty">
            Carregando...
          </div>
        ) : (
          <>
            {visitas.slice(0, 6).map((v) => (
              <VisitRow
                key={v.id}
                v={v}
              />
            ))}

            {!visitas.length && (
              <Empty text="Nenhuma visita registrada ainda." />
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card metric">
      <div className="metric-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SectionHead({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <h3>{title}</h3>
        <span>Visão rápida dos registros</span>
      </div>

      {action}
    </div>
  );
}

function VisitRow({
  v,
  admin = false,
}: {
  v: Visita;
  admin?: boolean;
}) {
  const date = new Date(v.dataVisita);

  return (
    <a
      className="visit-row"
      href={`/visita/${v.id}`}
    >
      <div className="date-box">
        <strong>
          {date
            .getDate()
            .toString()
            .padStart(2, '0')}
        </strong>

        <span>
          {date
            .toLocaleString('pt-BR', {
              month: 'short',
            })
            .replace('.', '')}
        </span>
      </div>

      <div className="visit-main">
        <strong>{v.cliente.nome}</strong>

        <span>
          {admin
            ? v.colaborador.nome
            : `${v.despesas.length} comprovante(s)`}
        </span>
      </div>

      <div className="visit-total">
        <strong>
          {money.format(Number(v.total || 0))}
        </strong>

        <StatusPill status={v.status} />
      </div>

      <ChevronRight
        className="chevron"
        size={18}
      />
    </a>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="empty">
      <FileText size={28} />
      <span>{text}</span>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState<any>();
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('/admin/dashboard'),
      api('/visitas'),
    ])
      .then(([statsData, visitasData]) => {
        setStats(statsData);
        setVisitas(visitasData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page stack gap-lg">
      <div className="hero">
        <div>
          <div className="eyebrow">PAINEL</div>

          <h2>Visão geral.</h2>

          <p>
            Acompanhe as prestações e aprove o
            que estiver pendente.
          </p>
        </div>

        <a
          className="secondary"
          href="/relatorios"
        >
          <BarChart3 size={17} />
          Relatórios
        </a>
      </div>

      <div className="grid-5">
        {stats ? (
          <>
            <Metric
              label="Visitas no mês"
              value={String(stats.visitasMes || 0)}
              icon={<FileText />}
            />

            <Metric
              label="Total de gastos"
              value={money.format(
                Number(stats.totalGastos || 0)
              )}
              icon={<WalletCards />}
            />

            <Metric
              label="Pendentes"
              value={String(stats.pendentes || 0)}
              icon={<Activity />}
            />

            <Metric
              label="Aprovadas"
              value={String(stats.aprovadas || 0)}
              icon={<Check />}
            />

            <Metric
              label="Reprovadas"
              value={String(stats.reprovadas || 0)}
              icon={<X />}
            />
          </>
        ) : (
          <div className="card loading-card">
            {loading
              ? 'Carregando...'
              : 'Não foi possível carregar os dados.'}
          </div>
        )}
      </div>

      <section className="card">
        <SectionHead
          title="Prestações recentes"
          action={
            <a
              className="link-button"
              href="/visitas"
            >
              Ver todas
            </a>
          }
        />

        {visitas.slice(0, 8).map((v) => (
          <VisitRow
            key={v.id}
            v={v}
            admin
          />
        ))}

        {!visitas.length && !loading && (
          <Empty text="Nenhum registro encontrado." />
        )}
      </section>
    </div>
  );
}

function VisitList({
  mine = false,
}: {
  mine?: boolean;
}) {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const query = status
        ? `?status=${encodeURIComponent(status)}`
        : '';

      const data = await api(`/visitas${query}`);

      setVisitas(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar as visitas.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return visitas;
    }

    return visitas.filter((v) =>
      `${v.cliente?.nome || ''} ${
        v.colaborador?.nome || ''
      }`
        .toLowerCase()
        .includes(term)
    );
  }, [visitas, search]);

  return (
    <div className="page stack gap-lg">
      <div className="hero compact">
        <div>
          <div className="eyebrow">
            HISTÓRICO
          </div>

          <h2>
            {mine
              ? 'Minhas visitas'
              : 'Todas as visitas'}
          </h2>

          <p>
            {mine
              ? 'Acompanhe seus registros e aprovações.'
              : 'Filtre e analise as prestações da equipe.'}
          </p>
        </div>

        {mine && (
          <a
            className="primary"
            href="/nova-visita"
          >
            <Plus size={17} />
            Nova visita
          </a>
        )}
      </div>

      <section className="card">
        <div className="filters">
          <div className="search">
            <Search size={17} />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Buscar cliente ou colaborador"
            />
          </div>

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
          >
            <option value="">
              Todos os status
            </option>

            <option value="AGUARDANDO">
              Aguardando
            </option>

            <option value="APROVADO">
              Aprovado
            </option>

            <option value="REPROVADO">
              Reprovado
            </option>
          </select>

          <div className="filter-note">
            <Filter size={14} />
            {filtered.length} registro(s)
          </div>
        </div>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty">
            Carregando...
          </div>
        ) : (
          filtered.map((v) => (
            <VisitRow
              key={v.id}
              v={v}
              admin={!mine}
            />
          ))
        )}

        {!loading && !filtered.length && (
          <Empty text="Nenhuma visita encontrada." />
        )}
      </section>
    </div>
  );
}

function NewVisit() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [data, setData] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [obs, setObs] = useState('');
  const [ida, setIda] = useState('');
  const [volta, setVolta] = useState('');
  const [idaFile, setIdaFile] =
    useState<File | null>(null);
  const [voltaFile, setVoltaFile] =
    useState<File | null>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/clientes')
      .then((data) =>
        setClientes(
          Array.isArray(data) ? data : []
        )
      )
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar os clientes.'
        )
      );
  }, []);

  const validateStep = () => {
    if (step === 1 && !clienteId) {
      setError('Selecione um cliente.');
      return false;
    }

    if (step === 1 && !data) {
      setError('Informe a data da visita.');
      return false;
    }

    if (
      step === 2 &&
      (!Number(ida) ||
        Number(ida) <= 0 ||
        !idaFile)
    ) {
      setError(
        'Informe um valor válido e o comprovante da ida.'
      );
      return false;
    }

    if (
      step === 3 &&
      (!Number(volta) ||
        Number(volta) <= 0 ||
        !voltaFile)
    ) {
      setError(
        'Informe um valor válido e o comprovante da volta.'
      );
      return false;
    }

    setError('');
    return true;
  };

  const uploadFile = async (
    id: string,
    tipo: 'IDA' | 'VOLTA',
    file: File
  ) => {
    const fd = new FormData();

    fd.append('comprovante', file);

    return api(
      `/visitas/${id}/comprovante/${tipo}`,
      {
        method: 'POST',
        body: fd,
      }
    );
  };

  const submit = async () => {
    if (busy) return;

    setBusy(true);
    setError('');

    try {
      const v = await api('/visitas', {
        method: 'POST',
        body: JSON.stringify({
          clienteId,
          dataVisita: data,
          observacao: obs,
          despesas: [
            {
              tipo: 'IDA',
              valor: Number(ida),
              categoria: 'Uber',
            },
            {
              tipo: 'VOLTA',
              valor: Number(volta),
              categoria: 'Uber',
            },
          ],
        }),
      });

      if (!v?.id) {
        throw new Error(
          'A visita foi criada, mas o servidor não retornou o ID.'
        );
      }

      if (idaFile) {
        await uploadFile(
          v.id,
          'IDA',
          idaFile
        );
      }

      if (voltaFile) {
        await uploadFile(
          v.id,
          'VOLTA',
          voltaFile
        );
      }

      await api(
        `/visitas/${v.id}/submit`,
        {
          method: 'POST',
        }
      );

      navigate(`/visita/${v.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar.'
      );
    } finally {
      setBusy(false);
    }
  };

  const total =
    (Number(ida) || 0) +
    (Number(volta) || 0);

  return (
    <div className="page stack gap-lg">
      <div className="hero compact">
        <div>
          <div className="eyebrow">
            NOVA PRESTAÇÃO
          </div>

          <h2>Registrar visita</h2>

          <p>
            Leva poucos passos. Os comprovantes ficam
            vinculados a cada despesa.
          </p>
        </div>

        <a
          className="secondary"
          href="/minhas-visitas"
        >
          <ArrowLeft size={17} />
          Voltar
        </a>
      </div>

      <div className="stepper">
        {[
          'Visita',
          'Uber ida',
          'Uber volta',
          'Resumo',
        ].map((s, i) => (
          <div
            key={s}
            className={`step ${
              step === i + 1 ? 'active' : ''
            } ${
              step > i + 1 ? 'done' : ''
            }`}
          >
            <span>
              {step > i + 1 ? (
                <Check size={14} />
              ) : (
                i + 1
              )}
            </span>

            <label>{s}</label>
          </div>
        ))}
      </div>

      <section className="card form-card">
        {step === 1 && (
          <>
            <label>
              Cliente *
              <select
                value={clienteId}
                onChange={(e) =>
                  setClienteId(e.target.value)
                }
              >
                <option value="">
                  Selecione um cliente
                </option>

                {clientes.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Data da visita *
              <input
                type="date"
                value={data}
                onChange={(e) =>
                  setData(e.target.value)
                }
              />
            </label>

            <label>
              Observação
              <textarea
                value={obs}
                onChange={(e) =>
                  setObs(e.target.value)
                }
                placeholder="Ex.: reunião, gravação, atendimento..."
              />
            </label>
          </>
        )}

        {step === 2 && (
          <ExpenseStep
            title="Uber — Ida"
            value={ida}
            setValue={setIda}
            file={idaFile}
            setFile={setIdaFile}
          />
        )}

        {step === 3 && (
          <ExpenseStep
            title="Uber — Volta"
            value={volta}
            setValue={setVolta}
            file={voltaFile}
            setFile={setVoltaFile}
          />
        )}

        {step === 4 && (
          <Summary
            cliente={
              clientes.find(
                (c) => c.id === clienteId
              )?.nome || ''
            }
            data={data}
            obs={obs}
            ida={Number(ida)}
            volta={Number(volta)}
            idaFile={idaFile}
            voltaFile={voltaFile}
            total={total}
          />
        )}

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <div className="form-actions">
          {step > 1 && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setError('');
                setStep(
                  (current) => current - 1
                );
              }}
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              className="primary"
              onClick={() => {
                if (validateStep()) {
                  setStep(
                    (current) => current + 1
                  );
                }
              }}
            >
              Continuar
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={submit}
            >
              {busy
                ? 'Enviando...'
                : 'Enviar prestação'}
              <Check size={16} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function ExpenseStep({
  title,
  value,
  setValue,
  file,
  setFile,
}: {
  title: string;
  value: string;
  setValue: (value: string) => void;
  file: File | null;
  setFile: (file: File | null) => void;
}) {
  const ref =
    useRef<HTMLInputElement>(null);

  return (
    <div className="expense-step">
      <div className="expense-head">
        <div className="round-icon">
          <WalletCards size={18} />
        </div>

        <div>
          <h3>{title}</h3>
          <span>
            Informe o valor e anexe o comprovante.
          </span>
        </div>
      </div>

      <label>
        Valor da corrida *

        <div className="money-input">
          <span>R$</span>

          <input
            inputMode="decimal"
            value={value}
            onChange={(e) =>
              setValue(
                e.target.value
                  .replace(/[^\d,.-]/g, '')
                  .replace(',', '.')
              )
            }
            placeholder="0,00"
          />
        </div>
      </label>

      <label>
        Comprovante *

        <input
          ref={ref}
          className="file-input"
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={(e) =>
            setFile(
              e.target.files?.[0] || null
            )
          }
        />

        <div
          className={`upload-box ${
            file ? 'selected' : ''
          }`}
          onClick={() =>
            ref.current?.click()
          }
        >
          <Upload size={22} />

          <strong>
            {file
              ? file.name
              : 'Adicionar comprovante'}
          </strong>

          <span>
            {file
              ? 'Arquivo selecionado'
              : 'Toque para abrir câmera, galeria ou arquivos'}
          </span>
        </div>
      </label>
    </div>
  );
}

function Summary({
  cliente,
  data,
  obs,
  ida,
  volta,
  idaFile,
  voltaFile,
  total,
}: {
  cliente: string;
  data: string;
  obs: string;
  ida: number;
  volta: number;
  idaFile: File | null;
  voltaFile: File | null;
  total: number;
}) {
  return (
    <div className="summary">
      <div className="summary-grid">
        <SummaryItem
          label="Cliente"
          value={cliente}
        />

        <SummaryItem
          label="Data"
          value={
            data
              ? new Date(
                  `${data}T00:00:00`
                ).toLocaleDateString('pt-BR')
              : '-'
          }
        />
      </div>

      {obs && (
        <div className="summary-note">
          <span>Observação</span>
          <strong>{obs}</strong>
        </div>
      )}

      <div className="expense-line">
        <span>Uber — Ida</span>
        <strong>{money.format(ida)}</strong>
      </div>

      <div className="expense-line">
        <span>Comprovante</span>
        <strong>
          {idaFile?.name || 'Não informado'}
        </strong>
      </div>

      <div className="expense-line">
        <span>Uber — Volta</span>
        <strong>{money.format(volta)}</strong>
      </div>

      <div className="expense-line">
        <span>Comprovante</span>
        <strong>
          {voltaFile?.name || 'Não informado'}
        </strong>
      </div>

      <div className="total-line">
        <span>Total</span>
        <strong>{money.format(total)}</strong>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function VisitDetail({
  user,
}: {
  user: User;
}) {
  const { id } = useParams<{
    id: string;
  }>();

  const navigate = useNavigate();

  const [v, setV] =
    useState<Visita | null>(null);

  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) {
      setError('Visita não encontrada.');
      return;
    }

    try {
      setError('');

      const data = await api(
        `/visitas/${id}`
      );

      setV(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar a visita.'
      );
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!v) {
    return (
      <div className="empty">
        {error || 'Carregando...'}
      </div>
    );
  }

  const approve = async () => {
    if (busy) return;

    setBusy(true);

    try {
      await api(
        `/visitas/${v.id}/approve`,
        {
          method: 'POST',
        }
      );

      await load();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Não foi possível aprovar.'
      );
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reason.trim() || busy) {
      return;
    }

    setBusy(true);

    try {
      await api(
        `/visitas/${v.id}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({
            motivo: reason.trim(),
          }),
        }
      );

      setModal(false);
      setReason('');

      await load();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Não foi possível reprovar.'
      );
    } finally {
      setBusy(false);
    }
  };

  const canAdmin =
    user.perfil === 'ADMIN';

  const fileUrl = (d: Despesa) => {
    if (!d.comprovanteUrl) {
      return '';
    }

    if (
      d.comprovanteUrl.startsWith('http')
    ) {
      return d.comprovanteUrl;
    }

    const base = API.replace(
      /\/api\/?$/,
      ''
    );

    return `${base}${d.comprovanteUrl}`;
  };

  const openFile = async (
    d: Despesa
  ) => {
    const url = fileUrl(d);

    if (!url) return;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${
            localStorage.getItem('cv_token') || ''
          }`,
        },
      });

      if (!response.ok) {
        throw new Error(
          'Não foi possível abrir o comprovante.'
        );
      }

      const blob =
        await response.blob();

      const objectUrl =
        URL.createObjectURL(blob);

      window.open(
        objectUrl,
        '_blank',
        'noopener,noreferrer'
      );

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 30000);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Não foi possível abrir o comprovante.'
      );
    }
  };

  return (
    <div className="page stack gap-lg">
      <div className="hero compact">
        <div>
          <div className="eyebrow">
            PRESTAÇÃO
          </div>

          <h2>{v.cliente.nome}</h2>

          <p>
            {formatDate(v.dataVisita)} ·{' '}
            {v.colaborador.nome}
          </p>
        </div>

        <div className="hero-actions">
          <StatusPill status={v.status} />

          <button
            type="button"
            className="secondary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        </div>
      </div>

      {v.status === 'REPROVADO' &&
        v.motivoReprovacao && (
          <div className="warning-banner">
            <ShieldCheck size={18} />

            <div>
              <strong>
                Correção necessária
              </strong>

              <span>
                {v.motivoReprovacao}
              </span>
            </div>
          </div>
        )}

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="detail-grid">
        <section className="card">
          <SectionHead title="Resumo" />

          <div className="detail-list">
            <div>
              <span>Colaborador</span>
              <strong>
                {v.colaborador.nome}
              </strong>
            </div>

            <div>
              <span>Cliente</span>
              <strong>
                {v.cliente.nome}
              </strong>
            </div>

            <div>
              <span>Data</span>
              <strong>
                {formatDate(v.dataVisita)}
              </strong>
            </div>

            {v.observacao && (
              <div>
                <span>Observação</span>
                <strong>
                  {v.observacao}
                </strong>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <SectionHead title="Despesas" />

          {v.despesas.map((d) => (
            <div
              className="detail-expense"
              key={
                d.id ||
                `${d.tipo}-${d.valor}`
              }
            >
              <div>
                <strong>
                  {d.categoria} —{' '}
                  {d.tipo === 'IDA'
                    ? 'Ida'
                    : d.tipo === 'VOLTA'
                    ? 'Volta'
                    : 'Outro'}
                </strong>

                <span>
                  {d.comprovanteUrl
                    ? 'Comprovante anexado'
                    : 'Sem comprovante'}
                </span>
              </div>

              <div>
                <strong>
                  {money.format(
                    Number(d.valor || 0)
                  )}
                </strong>

                {d.comprovanteUrl && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      openFile(d)
                    }
                    aria-label="Abrir comprovante"
                  >
                    <Eye size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="total-line">
            <span>Total</span>

            <strong>
              {money.format(
                Number(v.total || 0)
              )}
            </strong>
          </div>
        </section>
      </div>

      {canAdmin &&
        v.status === 'AGUARDANDO' && (
          <div className="approval-bar">
            <div>
              <strong>
                Pronto para análise?
              </strong>

              <span>
                Confira os dois comprovantes
                antes de aprovar.
              </span>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary danger"
                disabled={busy}
                onClick={() =>
                  setModal(true)
                }
              >
                <X size={16} />
                Reprovar
              </button>

              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={approve}
              >
                <Check size={16} />
                Aprovar
              </button>
            </div>
          </div>
        )}

      {modal && (
        <div className="modal-wrap">
          <div className="modal">
            <button
              type="button"
              className="icon-btn close"
              onClick={() =>
                setModal(false)
              }
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            <div className="round-icon">
              <X size={18} />
            </div>

            <h3>
              Reprovar prestação
            </h3>

            <p>
              Informe o motivo para o
              colaborador corrigir o registro.
            </p>

            <textarea
              value={reason}
              onChange={(e) =>
                setReason(e.target.value)
              }
              placeholder="Ex.: comprovante ilegível..."
            />

            <button
              type="button"
              className="primary full"
              disabled={
                busy || !reason.trim()
              }
              onClick={reject}
            >
              {busy
                ? 'Confirmando...'
                : 'Confirmar reprovação'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Clients() {
  const [items, setItems] =
    useState<Cliente[]>([]);

  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api('/clientes');

      setItems(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os clientes.'
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!nome.trim() || busy) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      await api('/clientes', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome.trim(),
          codigo: codigo.trim(),
        }),
      });

      setNome('');
      setCodigo('');
      setOpen(false);

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível criar o cliente.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page stack gap-lg">
      <div className="hero compact">
        <div>
          <div className="eyebrow">
            CADASTRO
          </div>

          <h2>Clientes</h2>

          <p>
            Cadastre os clientes que aparecem
            nas visitas.
          </p>
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => setOpen(true)}
        >
          <Plus size={17} />
          Novo cliente
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <section className="card list-card">
        {items.map((c) => (
          <div
            className="admin-row"
            key={c.id}
          >
            <div>
              <strong>{c.nome}</strong>

              <span>
                {c.codigo ||
                  'Sem código'}
              </span>
            </div>

            <span className="soft-tag">
              Ativo
            </span>
          </div>
        ))}

        {!items.length && (
          <Empty text="Nenhum cliente cadastrado." />
        )}
      </section>

      {open && (
        <div className="modal-wrap">
          <div className="modal">
            <button
              type="button"
              className="icon-btn close"
              onClick={() =>
                setOpen(false)
              }
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            <h3>Novo cliente</h3>

            <label>
              Nome
              <input
                value={nome}
                onChange={(e) =>
                  setNome(e.target.value)
                }
              />
            </label>

            <label>
              Código
              <input
                value={codigo}
                onChange={(e) =>
                  setCodigo(e.target.value)
                }
              />
            </label>

            <button
              type="button"
              className="primary full"
              disabled={
                busy || !nome.trim()
              }
              onClick={create}
            >
              {busy
                ? 'Salvando...'
                : 'Salvar cliente'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersAdmin() {
  const [items, setItems] =
    useState<User[]>([]);

  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    nome: '',
    email: '',
    cargo: '',
    perfil: 'COLABORADOR' as Role,
    senha: 'Temp@123456',
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api(
        '/admin/users'
      );

      setItems(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os usuários.'
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (
      busy ||
      !form.nome.trim() ||
      !form.email.trim() ||
      !form.senha.trim()
    ) {
      setError(
        'Preencha nome, e-mail e senha.'
      );
      return;
    }

    setBusy(true);
    setError('');

    try {
      await api('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          nome: form.nome.trim(),
          email: form.email.trim(),
          cargo: form.cargo.trim(),
        }),
      });

      setOpen(false);

      setForm({
        nome: '',
        email: '',
        cargo: '',
        perfil: 'COLABORADOR',
        senha: 'Temp@123456',
      });

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível criar o usuário.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page stack gap-lg">
      <div className="hero compact">
        <div>
          <div className="eyebrow">
            EQUIPE
          </div>

          <h2>Usuários</h2>

          <p>
            O administrador cria os acessos
            dos colaboradores.
          </p>
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => setOpen(true)}
        >
          <UserPlus size={17} />
          Novo acesso
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <section className="card list-card">
        {items.map((u) => (
          <div
            className="admin-row"
            key={u.id}
          >
            <div className="person">
              <img
                src={avatarUrl(u)}
                alt={u.nome}
              />

              <div>
                <strong>{u.nome}</strong>

                <span>
                  {u.email} ·{' '}
                  {u.cargo || u.perfil}
                </span>
              </div>
            </div>

            <span
              className={`soft-tag ${
                !u.ativo ? 'muted' : ''
              }`}
            >
              {u.ativo
                ? 'Ativo'
                : 'Inativo'}
            </span>
          </div>
        ))}
      </section>

      {open && (
        <div className="modal-wrap">
          <div className="modal wide">
            <button
              type="button"
              className="icon-btn close"
              onClick={() =>
                setOpen(false)
              }
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            <h3>Criar acesso</h3>

            <div className="form-grid">
              <label>
                Nome
                <input
                  value={form.nome}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nome: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                E-mail
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Cargo
                <input
                  value={form.cargo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cargo: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Perfil
                <select
                  value={form.perfil}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      perfil:
                        e.target.value as Role,
                    })
                  }
                >
                  <option value="COLABORADOR">
                    Colaborador
                  </option>

                  <option value="ADMIN">
                    Administrador
                  </option>
                </select>
              </label>

              <label className="span-2">
                Senha inicial
                <input
                  type="password"
                  value={form.senha}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      senha: e.target.value,
                    })
                  }
                />
              </label>
            </div>

            <p className="hint">
              O colaborador poderá trocar a
              senha depois do primeiro acesso.
            </p>

            <button
              type="button"
              className="primary full"
              disabled={busy}
              onClick={create}
            >
              {busy
                ? 'Criando...'
                : 'Criar usuário'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Reports() {
  const today = new Date();

  const firstDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  const [rows, setRows] =
    useState<any[]>([]);

  const [inicio, setInicio] =
    useState(
      firstDay
        .toISOString()
        .slice(0, 10)
    );

  const [fim, setFim] =
    useState(
      today
        .toISOString()
        .slice(0, 10)
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const generate = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api(
        `/admin/relatorio?inicio=${encodeURIComponent(
          inicio
        )}&fim=${encodeURIComponent(fim)}`
      );

      setRows(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível gerar o relatório.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
  }, []);

  const total = rows.reduce(
    (sum, row) =>
      sum + Number(row.total || 0),
    0
  );

  const exportCsv = () => {
    if (!rows.length) {
      alert(
        'Não existem dados para exportar.'
      );
      return;
    }

    const header =
      'data,colaborador,cliente,ida,volta,total,status\n';

    const csv =
      header +
      rows
        .map((r) =>
          [
            r.data,
            r.colaborador,
            r.cliente,
            Number(r.ida || 0).toFixed(2),
            Number(r.volta || 0).toFixed(2),
            Number(r.total || 0).toFixed(2),
            r.status,
          ]
            .map(
              (x) =>
                `"${String(x).replaceAll(
                  '"',
                  '""'
                )}"`
            )
            .join(',')
        )
        .join('\n');

    const blob = new Blob(
      [csv],
      {
        type: 'text/csv;charset=utf-8;',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement('a');

    a.href = url;
    a.download =
      'relatorio-visitas.csv';

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="page stack gap-lg">
      <div className="hero compact">
        <div>
          <div className="eyebrow">
            ANÁLISE
          </div>

          <h2>Relatórios</h2>

          <p>
            Consulte o período e exporte os
            dados para o financeiro.
          </p>
        </div>

        <button
          type="button"
          className="secondary"
          onClick={exportCsv}
        >
          <FileText size={17} />
          Exportar CSV
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <section className="card">
        <div className="filters report-filters">
          <label>
            Início
            <input
              type="date"
              value={inicio}
              onChange={(e) =>
                setInicio(e.target.value)
              }
            />
          </label>

          <label>
            Fim
            <input
              type="date"
              value={fim}
              onChange={(e) =>
                setFim(e.target.value)
              }
            />
          </label>

          <button
            type="button"
            className="primary"
            disabled={loading}
            onClick={generate}
          >
            {loading
              ? 'Atualizando...'
              : 'Atualizar'}
          </button>
        </div>

        <div className="grid-3">
          <Metric
            label="Visitas"
            value={String(rows.length)}
            icon={<FileText />}
          />

          <Metric
            label="Total"
            value={money.format(total)}
            icon={<WalletCards />}
          />

          <Metric
            label="Média por visita"
            value={money.format(
              rows.length
                ? total / rows.length
                : 0
            )}
            icon={<BarChart3 />}
          />
        </div>

        <div className="table-like">
          <div className="table-head">
            <span>Data</span>
            <span>Colaborador</span>
            <span>Cliente</span>
            <span>Total</span>
            <span>Status</span>
          </div>

          {rows.map((r, i) => (
            <div
              className="table-row"
              key={r.id || i}
            >
              <span>
                {new Date(
                  `${r.data}T00:00:00`
                ).toLocaleDateString(
                  'pt-BR'
                )}
              </span>

              <span>
                {r.colaborador}
              </span>

              <span>{r.cliente}</span>

              <strong>
                {money.format(
                  Number(r.total || 0)
                )}
              </strong>

              <StatusPill
                status={r.status}
              />
            </div>
          ))}
        </div>

        {!rows.length && !loading && (
          <Empty text="Nenhum registro no período." />
        )}
      </section>
    </div>
  );
}

function Profile({
  user,
  setUser,
}: {
  user: User;
  setUser: React.Dispatch<
    React.SetStateAction<User | null>
  >;
}) {
  const [nome, setNome] =
    useState(user.nome);

  const [current, setCurrent] =
    useState('');

  const [next, setNext] =
    useState('');

  const ref =
    useRef<HTMLInputElement>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [msg, setMsg] =
    useState('');

  const [error, setError] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const save = async () => {
    if (busy) return;

    setBusy(true);
    setError('');
    setMsg('');

    try {
      const fd = new FormData();

      fd.append('nome', nome.trim());

      if (file) {
        fd.append('foto', file);
      }

      const updated = await api(
        '/me/profile',
        {
          method: 'POST',
          body: fd,
        }
      );

      setUser({
        ...user,
        ...updated,
      });

      setFile(null);
      setMsg('Perfil atualizado.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar o perfil.'
      );
    } finally {
      setBusy(false);
    }
  };

  const change = async () => {
    if (
      !current ||
      !next ||
      busy
    ) {
      setError(
        'Informe a senha atual e a nova senha.'
      );
      return;
    }

    setBusy(true);
    setError('');
    setMsg('');

    try {
      await api(
        '/auth/change-password',
        {
          method: 'POST',
          body: JSON.stringify({
            senhaAtual: current,
            novaSenha: next,
          }),
        }
      );

      setCurrent('');
      setNext('');

      setMsg(
        'Senha alterada com sucesso.'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível alterar a senha.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page stack gap-lg">
      <div className="hero compact">
        <div>
          <div className="eyebrow">
            CONTA
          </div>

          <h2>Meu perfil</h2>

          <p>
            Atualize seus dados e sua foto de
            perfil.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="detail-grid">
        <section className="card profile-card">
          <div className="profile-photo">
            <img
              src={
                file
                  ? URL.createObjectURL(file)
                  : avatarUrl(user)
              }
              alt={user.nome}
            />

            <button
              type="button"
              className="icon-btn"
              onClick={() =>
                ref.current?.click()
              }
              aria-label="Alterar foto"
            >
              <Upload size={16} />
            </button>

            <input
              ref={ref}
              type="file"
              hidden
              accept="image/*"
              capture="user"
              onChange={(e) =>
                setFile(
                  e.target.files?.[0] ||
                    null
                )
              }
            />
          </div>

          <label>
            Nome
            <input
              value={nome}
              onChange={(e) =>
                setNome(e.target.value)
              }
            />
          </label>

          <label>
            E-mail
            <input
              value={user.email}
              disabled
            />
          </label>

          <label>
            Cargo
            <input
              value={user.cargo || ''}
              disabled
            />
          </label>

          <button
            type="button"
            className="primary full"
            disabled={busy}
            onClick={save}
          >
            {busy
              ? 'Salvando...'
              : 'Salvar perfil'}
          </button>

          {msg && (
            <div className="success-banner">
              {msg}
            </div>
          )}
        </section>

        <section className="card">
          <SectionHead title="Segurança" />

          <label>
            Senha atual
            <input
              type="password"
              value={current}
              onChange={(e) =>
                setCurrent(e.target.value)
              }
              autoComplete="current-password"
            />
          </label>

          <label>
            Nova senha
            <input
              type="password"
              value={next}
              onChange={(e) =>
                setNext(e.target.value)
              }
              placeholder="Mínimo de 8 caracteres"
              autoComplete="new-password"
            />
          </label>

          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={change}
          >
            Alterar senha
          </button>

          <div className="hint">
            A redefinição por e-mail pode ser
            conectada depois ao provedor de
            e-mail da empresa.
          </div>
        </section>
      </div>
    </div>
  );
}

createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
