import { useEffect, useMemo, useState } from "react";
import "./App.css";

type User = { name: string; email: string; password: string };
type Transaction = { id: string; title: string; category: string; amount: number; type: "income" | "expense"; date: string };
type Goal = { id: string; title: string; target: number; saved: number; deadline: string };
type Bill = { id: string; title: string; amount: number; due: string; paid: boolean };
type Budget = { category: string; limit: number };
type Data = { transactions: Transaction[]; goals: Goal[]; bills: Bill[]; budgets: Budget[] };
const USERS_KEY = "meubolso_users_v1";
const SESSION_KEY = "meubolso_session_v1";
const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

const starterData = (): Data => ({
  transactions: [
    { id: uid(), title: "Salário", category: "Salário", amount: 4200, type: "income", date: today() },
    { id: uid(), title: "Mercado", category: "Alimentação", amount: 286.5, type: "expense", date: today() },
    { id: uid(), title: "Internet", category: "Moradia", amount: 99.9, type: "expense", date: today() },
    { id: uid(), title: "Transporte", category: "Transporte", amount: 145, type: "expense", date: today() },
  ],
  goals: [{ id: uid(), title: "Reserva de emergência", target: 5000, saved: 1250, deadline: "" }],
  bills: [{ id: uid(), title: "Conta de luz", amount: 130, due: today(), paid: false }],
  budgets: [{ category: "Alimentação", limit: 650 }, { category: "Transporte", limit: 300 }, { category: "Lazer", limit: 250 }, { category: "Moradia", limit: 1200 }],
});
const readUsers = (): User[] => { try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; } };
const dataKey = (email: string) => `meubolso_data_${email.toLowerCase()}`;
const readData = (email: string): Data => { try { return JSON.parse(localStorage.getItem(dataKey(email)) || "null") || starterData(); } catch { return starterData(); } };

function App() {
  const [users, setUsers] = useState<User[]>(readUsers);
  const [user, setUser] = useState<User | null>(() => {
    try { const email = localStorage.getItem(SESSION_KEY); return email ? readUsers().find(u => u.email === email) || null : null; } catch { return null; }
  });
  const [data, setData] = useState<Data>(() => user ? readData(user.email) : starterData());
  const [page, setPage] = useState("Visão geral");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"transaction" | "goal" | "bill" | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }, [users]);
  useEffect(() => { if (user) localStorage.setItem(dataKey(user.email), JSON.stringify(data)); }, [data, user]);
  useEffect(() => { if (notice) { const t = window.setTimeout(() => setNotice(""), 2800); return () => window.clearTimeout(t); } }, [notice]);

  const income = useMemo(() => data.transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0), [data.transactions]);
  const expenses = useMemo(() => data.transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0), [data.transactions]);
  const balance = income - expenses;
  const expenseByCategory = useMemo(() => data.transactions.filter(t => t.type === "expense").reduce<Record<string, number>>((a, t) => { a[t.category] = (a[t.category] || 0) + t.amount; return a; }, {}), [data.transactions]);
  const maxCategory = Math.max(1, ...Object.values(expenseByCategory));

  function authenticate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setAuthError("");
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    if (!email || !password) { setAuthError("Preencha e-mail e senha."); return; }
    if (authMode === "register") {
      if (name.length < 2) { setAuthError("Informe seu nome."); return; }
      if (password.length < 6) { setAuthError("A senha precisa ter pelo menos 6 caracteres."); return; }
      if (users.some(u => u.email === email)) { setAuthError("Já existe uma conta com esse e-mail."); return; }
      const created = { name, email, password };
      const next = [...users, created]; setUsers(next); localStorage.setItem(USERS_KEY, JSON.stringify(next));
      localStorage.setItem(dataKey(email), JSON.stringify(starterData())); localStorage.setItem(SESSION_KEY, email);
      setUser(created); setData(readData(email)); setPage("Visão geral"); setNotice("Conta criada com sucesso!");
    } else {
      const found = users.find(u => u.email === email && u.password === password);
      if (!found) { setAuthError("E-mail ou senha incorretos."); return; }
      localStorage.setItem(SESSION_KEY, email); setUser(found); setData(readData(email)); setPage("Visão geral");
    }
  }
  function logout() { localStorage.removeItem(SESSION_KEY); setUser(null); setData(starterData()); setPage("Visão geral"); setAuthMode("login"); setNotice("Você saiu da sua conta."); }
  function addTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount"));
    if (!amount || amount <= 0) return;
    const item: Transaction = { id: uid(), title: String(fd.get("title")).trim(), category: String(fd.get("category")), amount, type: String(fd.get("type")) as "income" | "expense", date: String(fd.get("date")) };
    setData(d => ({ ...d, transactions: [item, ...d.transactions] })); setModal(null); setNotice("Movimentação adicionada!");
  }
  function addGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const item: Goal = { id: uid(), title: String(fd.get("title")), target: Number(fd.get("target")), saved: Number(fd.get("saved") || 0), deadline: String(fd.get("deadline") || "") };
    if (!item.title || item.target <= 0) return;
    setData(d => ({ ...d, goals: [...d.goals, item] })); setModal(null); setNotice("Meta criada!");
  }
  function addBill(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const item: Bill = { id: uid(), title: String(fd.get("title")), amount: Number(fd.get("amount")), due: String(fd.get("due")), paid: false };
    if (!item.title || item.amount <= 0) return;
    setData(d => ({ ...d, bills: [...d.bills, item] })); setModal(null); setNotice("Conta cadastrada!");
  }
  function removeTransaction(id: string) { setData(d => ({ ...d, transactions: d.transactions.filter(t => t.id !== id) })); setNotice("Movimentação removida."); }
  function updateGoal(id: string, amount: number) { setData(d => ({ ...d, goals: d.goals.map(g => g.id === id ? { ...g, saved: Math.min(g.target, Math.max(0, g.saved + amount)) } : g) })); }
  function updateBudget(category: string, limit: number) { setData(d => ({ ...d, budgets: d.budgets.map(b => b.category === category ? { ...b, limit } : b) })); }

  if (!user) return <AuthScreen mode={authMode} setMode={m => { setAuthMode(m); setAuthError(""); }} onSubmit={authenticate} error={authError} />;

  const nav = [
    { label: "Visão geral", icon: "⌂" }, { label: "Movimentações", icon: "↕" }, { label: "Planejamento", icon: "▤" },
    { label: "Metas", icon: "◎" }, { label: "Contas", icon: "▣" }, { label: "Relatórios", icon: "▥" },
    { label: "Educação financeira", icon: "✳" }, { label: "Configurações", icon: "⚙" },
  ];
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">M</div><div><strong>MeuBolso</strong><small>suas finanças em equilíbrio</small></div></div>
      <div className="side-label">MENU PRINCIPAL</div>
      <nav>{nav.map(n => <button key={n.label} className={`nav-item ${page === n.label ? "active" : ""}`} onClick={() => setPage(n.label)}><span className="nav-icon">{n.icon}</span>{n.label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><span>✦</span><strong>Pequenos passos,<br/>grandes conquistas.</strong><small>Organize hoje o futuro que deseja.</small></div><div className="user-mini"><div className="avatar">{user.name.charAt(0).toUpperCase()}</div><div className="user-mini-text"><strong>{user.name}</strong><small>{user.email}</small></div><button title="Configurações" onClick={() => setPage("Configurações")}>···</button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><div className="brand-mark">M</div><strong>MeuBolso</strong></div><div className="breadcrumb">MeuBolso <span>/</span> <b>{page}</b></div><div className="top-actions"><span className="today-label">{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span><button className="icon-button" onClick={() => setPage("Contas")} title="Notificações">♧</button><div className="avatar small">{user.name.charAt(0).toUpperCase()}</div></div></header>
      <div className="content">
        {page === "Visão geral" && <Dashboard user={user} balance={balance} income={income} expenses={expenses} showBalance={showBalance} setShowBalance={setShowBalance} data={data} expenseByCategory={expenseByCategory} maxCategory={maxCategory} setPage={setPage} openTransaction={() => setModal("transaction")} />}
        {page === "Movimentações" && <Transactions data={data} onAdd={() => setModal("transaction")} onRemove={removeTransaction} />}
        {page === "Planejamento" && <Planning data={data} expenseByCategory={expenseByCategory} editing={editingBudget} setEditing={setEditingBudget} onUpdate={updateBudget} />}
        {page === "Metas" && <Goals data={data} onAdd={() => setModal("goal")} onUpdate={updateGoal} onDelete={(id: string) => setData(d => ({ ...d, goals: d.goals.filter(g => g.id !== id) }))} />}
        {page === "Contas" && <Bills data={data} onAdd={() => setModal("bill")} onToggle={(id: string) => setData(d => ({ ...d, bills: d.bills.map(b => b.id === id ? { ...b, paid: !b.paid } : b) }))} onDelete={(id: string) => setData(d => ({ ...d, bills: d.bills.filter(b => b.id !== id) }))} />}
        {page === "Relatórios" && <Reports data={data} income={income} expenses={expenses} expenseByCategory={expenseByCategory} maxCategory={maxCategory} />}
        {page === "Educação financeira" && <Learning />}
        {page === "Configurações" && <Settings user={user} onLogout={logout} onReset={() => { if (confirm("Deseja apagar todos os seus dados financeiros? Essa ação não pode ser desfeita.")) { setData(starterData()); setNotice("Dados financeiros reiniciados."); } }} />}
      </div>
    </main>
    {notice && <div className="toast">✓ {notice}</div>}
    {modal && <Modal title={modal === "transaction" ? "Nova movimentação" : modal === "goal" ? "Criar nova meta" : "Adicionar conta"} onClose={() => setModal(null)}>
      {modal === "transaction" && <form className="form-grid" onSubmit={addTransaction}><label className="full">Descrição<input name="title" placeholder="Ex.: Compra no mercado" required/></label><label>Tipo<select name="type"><option value="expense">Despesa</option><option value="income">Receita</option></select></label><label>Categoria<select name="category">{["Alimentação","Moradia","Transporte","Saúde","Lazer","Educação","Salário","Outros"].map(c => <option key={c}>{c}</option>)}</select></label><label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" placeholder="0,00" required/></label><label>Data<input name="date" type="date" defaultValue={today()} required/></label><div className="form-actions full"><button type="button" className="btn-light" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary">Salvar movimentação</button></div></form>}
      {modal === "goal" && <form className="form-grid" onSubmit={addGoal}><label className="full">Nome da meta<input name="title" placeholder="Ex.: Viagem de férias" required/></label><label>Valor desejado (R$)<input name="target" type="number" min="1" step="0.01" required/></label><label>Já guardado (R$)<input name="saved" type="number" min="0" step="0.01" defaultValue="0"/></label><label className="full">Prazo (opcional)<input name="deadline" type="date"/></label><div className="form-actions full"><button type="button" className="btn-light" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary">Criar meta</button></div></form>}
      {modal === "bill" && <form className="form-grid" onSubmit={addBill}><label className="full">Nome da conta<input name="title" placeholder="Ex.: Aluguel" required/></label><label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Vencimento<input name="due" type="date" defaultValue={today()} required/></label><div className="form-actions full"><button type="button" className="btn-light" onClick={() => setModal(null)}>Cancelar</button><button className="btn-primary">Salvar conta</button></div></form>}
    </Modal>}
  </div>;
}

function AuthScreen({ mode, setMode, onSubmit, error }: { mode: "login" | "register"; setMode: (m: "login" | "register") => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; error: string }) {
  return <div className="auth-page"><div className="auth-decoration"><div className="auth-orb orb-one"/><div className="auth-orb orb-two"/><div className="auth-message"><div className="brand-mark light">M</div><h1>Cuide do seu dinheiro.<br/><em>Construa seus planos.</em></h1><p>Uma vida financeira mais organizada começa com pequenas escolhas todos os dias.</p><div className="auth-stat"><span>✦</span><div><strong>Clareza para decidir.</strong><small>Organização para conquistar.</small></div></div></div></div><div className="auth-panel"><div className="auth-form-wrap"><div className="brand auth-brand"><div className="brand-mark">M</div><div><strong>MeuBolso</strong><small>suas finanças em equilíbrio</small></div></div><span className="eyebrow">{mode === "login" ? "BEM-VINDO DE VOLTA" : "COMECE SUA JORNADA"}</span><h2>{mode === "login" ? "Acesse sua conta" : "Crie sua conta"}</h2><p className="muted">{mode === "login" ? "Entre para continuar organizando suas finanças." : "Preencha seus dados para começar a planejar."}</p><form onSubmit={onSubmit} className="auth-form">{mode === "register" && <label>Nome completo<input name="name" placeholder="Como podemos te chamar?" autoComplete="name" required/></label>}<label>E-mail<input name="email" type="email" placeholder="seuemail@exemplo.com" autoComplete="email" required/></label><label>Senha<input name="password" type="password" placeholder="Mínimo de 6 caracteres" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required/></label>{error && <div className="error-message">{error}</div>}<button className="btn-primary auth-submit">{mode === "login" ? "Entrar na minha conta" : "Criar minha conta"} <span>→</span></button></form><div className="auth-switch">{mode === "login" ? "Ainda não tem uma conta?" : "Já possui uma conta?"} <button onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Cadastre-se" : "Fazer login"}</button></div><div className="auth-foot">Ao continuar, você concorda com nossos termos de uso e política de privacidade.</div></div></div></div>;
}
function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) { return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section>; }
function Dashboard({ user, balance, income, expenses, showBalance, setShowBalance, data, expenseByCategory, maxCategory, setPage, openTransaction }: any) {
  const recent = data.transactions.slice(0, 5);
  return <><PageTitle eyebrow="SEU RESUMO FINANCEIRO" title={`Olá, ${user.name.split(" ")[0]}! 👋`} subtitle="Aqui está um panorama da sua vida financeira." action={<button className="btn-primary" onClick={openTransaction}>＋ Nova movimentação</button>}/><div className="summary-grid"><div className="balance-card"><div className="balance-top"><span>Saldo registrado</span><button onClick={() => setShowBalance(!showBalance)}>{showBalance ? "◉" : "◎"}</button></div><h2>{showBalance ? money(balance) : "••••••"}</h2><span className="balance-caption">Resultado das movimentações cadastradas</span><div className="balance-bottom"><span>↗ Controle seu dinheiro com clareza</span><span>MeuBolso</span></div></div><div className="metric-card"><div className="metric-icon income-icon">↗</div><span>Receitas registradas</span><strong>{money(income)}</strong><small>Entradas cadastradas</small></div><div className="metric-card"><div className="metric-icon expense-icon">↘</div><span>Despesas registradas</span><strong>{money(expenses)}</strong><small>Saídas cadastradas</small></div></div><div className="dashboard-grid"><Card><div className="card-heading"><div><h3>Despesas por categoria</h3><p>Distribuição dos gastos registrados</p></div><button className="text-button" onClick={() => setPage("Relatórios")}>Ver relatório →</button></div>{Object.keys(expenseByCategory).length ? <div className="category-bars">{Object.entries(expenseByCategory).sort((a: any,b: any) => b[1]-a[1]).slice(0,5).map(([cat, val]: any, i) => <div className="bar-row" key={cat}><div className="bar-label"><span>{cat}</span><strong>{money(val)}</strong></div><div className="bar-track"><div className={`bar-fill color-${i}`} style={{ width: `${val/maxCategory*100}%` }}/></div></div>)}</div> : <Empty text="Adicione despesas para visualizar suas categorias."/>}</Card><Card><div className="card-heading"><div><h3>Suas metas</h3><p>Acompanhe seus objetivos</p></div><button className="text-button" onClick={() => setPage("Metas")}>Ver todas →</button></div>{data.goals.length ? data.goals.slice(0,3).map((g: Goal) => <div className="mini-goal" key={g.id}><div className="goal-title"><strong>{g.title}</strong><span>{Math.round(g.saved/g.target*100)}%</span></div><div className="bar-track"><div className="bar-fill" style={{width:`${Math.min(100,g.saved/g.target*100)}%`}}/></div><small>{money(g.saved)} de {money(g.target)}</small></div>) : <Empty text="Crie sua primeira meta financeira."/>}</Card></div><Card><div className="card-heading"><div><h3>Movimentações recentes</h3><p>Últimos registros adicionados</p></div><button className="text-button" onClick={() => setPage("Movimentações")}>Ver todas →</button></div><TransactionTable items={recent} compact/></Card><div className="tip-banner"><div className="tip-icon">✦</div><div><strong>Um passo de cada vez</strong><p>Registrar seus gastos é o primeiro passo para entender seus hábitos e planejar melhor.</p></div><button onClick={() => setPage("Educação financeira")}>Aprender mais →</button></div></>;
}
function TransactionTable({ items, onRemove, compact = false }: { items: Transaction[]; onRemove?: (id:string)=>void; compact?: boolean }) {
  if (!items.length) return <Empty text="Nenhuma movimentação cadastrada ainda."/>;
  return <div className="table-wrap"><table><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th>{onRemove && <th/>}</tr></thead><tbody>{items.map(t => <tr key={t.id}><td><div className="transaction-name"><span className={`transaction-symbol ${t.type}`}>{t.type === "income" ? "↗" : "↘"}</span><strong>{t.title}</strong></div></td><td><span className="category-pill">{t.category}</span></td><td>{new Date(`${t.date}T12:00:00`).toLocaleDateString("pt-BR")}</td><td className={t.type === "income" ? "positive" : "negative"}>{t.type === "income" ? "+" : "−"} {money(t.amount)}</td>{onRemove && <td><button className="delete-button" title="Excluir" onClick={() => onRemove(t.id)}>×</button></td>}</tr>)}</tbody></table></div>;
}
function Transactions({ data, onAdd, onRemove }: any) { const [filter,setFilter] = useState("all"); const [search,setSearch] = useState(""); const items = data.transactions.filter((t:Transaction) => (filter === "all" || t.type === filter) && `${t.title} ${t.category}`.toLowerCase().includes(search.toLowerCase())); return <><PageTitle eyebrow="ACOMPANHE SEU DINHEIRO" title="Movimentações" subtitle="Registre e consulte todas as entradas e saídas." action={<button className="btn-primary" onClick={onAdd}>＋ Nova movimentação</button>}/><Card><div className="filter-row"><div className="search-box">⌕ <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar movimentação..."/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todas</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></div><TransactionTable items={items} onRemove={onRemove}/></Card></>; }
function Planning({ data, expenseByCategory, editing, setEditing, onUpdate }: any) { const [values,setValues] = useState<Record<string,string>>({}); return <><PageTitle eyebrow="ORGANIZE SEU MÊS" title="Planejamento financeiro" subtitle="Defina limites e acompanhe seus gastos por categoria." action={<button className="btn-light" onClick={()=>setEditing(!editing)}>{editing ? "Concluir edição" : "✎ Editar limites"}</button>}/><div className="planning-intro"><strong>Um orçamento realista começa com clareza.</strong><p>Os valores abaixo consideram as despesas que você registrou no aplicativo.</p></div><div className="budget-list">{data.budgets.map((b:Budget) => { const spent=expenseByCategory[b.category]||0; const pct=b.limit ? spent/b.limit*100 : 0; return <Card key={b.category}><div className="budget-head"><div><h3>{b.category}</h3><small>{money(spent)} utilizados de {money(b.limit)}</small></div>{editing ? <div className="budget-edit"><input type="number" min="0" value={values[b.category] ?? b.limit} onChange={e=>setValues(v=>({...v,[b.category]:e.target.value}))}/><button className="btn-primary compact-btn" onClick={()=>onUpdate(b.category,Number(values[b.category]??b.limit))}>Salvar</button></div> : <strong className={pct>100?"negative":""}>{Math.round(pct)}%</strong>}</div><div className="bar-track tall"><div className={`bar-fill ${pct>100?"over":""}`} style={{width:`${Math.min(100,pct)}%`}}/></div><div className="budget-foot"><span>{pct>100?"Limite ultrapassado":`Restam ${money(Math.max(0,b.limit-spent))}`}</span><span>Limite: {money(b.limit)}</span></div></Card>; })}</div></>; }
function Goals({ data, onAdd, onUpdate, onDelete }: any) { return <><PageTitle eyebrow="SEUS PLANOS EM MOVIMENTO" title="Metas financeiras" subtitle="Transforme seus objetivos em planos possíveis." action={<button className="btn-primary" onClick={onAdd}>＋ Nova meta</button>}/>{data.goals.length ? <div className="goals-grid">{data.goals.map((g:Goal)=><Card key={g.id}><div className="goal-card-top"><span className="goal-badge">◎</span><button className="delete-button" onClick={()=>onDelete(g.id)}>×</button></div><h3>{g.title}</h3><div className="goal-amount">{money(g.saved)} <small>de {money(g.target)}</small></div><div className="bar-track tall"><div className="bar-fill" style={{width:`${Math.min(100,g.saved/g.target*100)}%`}}/></div><div className="goal-progress"><strong>{Math.round(g.saved/g.target*100)}% concluído</strong>{g.deadline && <span>Até {new Date(`${g.deadline}T12:00:00`).toLocaleDateString("pt-BR")}</span>}</div><div className="goal-actions"><button className="btn-light" onClick={()=>onUpdate(g.id,-50)}>− R$ 50</button><button className="btn-primary" onClick={()=>onUpdate(g.id,50)}>＋ Guardar R$ 50</button></div></Card>)}</div> : <Card><Empty text="Você ainda não criou metas. Que tal começar com um objetivo?"/></Card>}</>; }
function Bills({ data, onAdd, onToggle, onDelete }: any) { const pending=data.bills.filter((b:Bill)=>!b.paid); return <><PageTitle eyebrow="NÃO PERCA OS PRAZOS" title="Contas e lembretes" subtitle="Tenha seus compromissos financeiros organizados." action={<button className="btn-primary" onClick={onAdd}>＋ Adicionar conta</button>}/><div className="metric-strip"><div><span>Contas cadastradas</span><strong>{data.bills.length}</strong></div><div><span>Pendentes</span><strong>{pending.length}</strong></div><div><span>Total pendente</span><strong>{money(pending.reduce((s:number,b:Bill)=>s+b.amount,0))}</strong></div></div><Card><div className="card-heading"><div><h3>Suas contas</h3><p>Marque como paga quando concluir o pagamento.</p></div></div>{data.bills.length ? <div className="bill-list">{data.bills.slice().sort((a:Bill,b:Bill)=>a.due.localeCompare(b.due)).map((b:Bill)=><div className={`bill-row ${b.paid?"paid":""}`} key={b.id}><div className="bill-date"><strong>{new Date(`${b.due}T12:00:00`).getDate()}</strong><small>{new Date(`${b.due}T12:00:00`).toLocaleDateString("pt-BR",{month:"short"})}</small></div><div className="bill-info"><strong>{b.title}</strong><small>{b.paid?"Pagamento concluído":`Vencimento: ${new Date(`${b.due}T12:00:00`).toLocaleDateString("pt-BR")}`}</small></div><strong>{money(b.amount)}</strong><button className={b.paid?"btn-light":"btn-primary"} onClick={()=>onToggle(b.id)}>{b.paid?"Desfazer":"Marcar paga"}</button><button className="delete-button" onClick={()=>onDelete(b.id)}>×</button></div>)}</div> : <Empty text="Nenhuma conta cadastrada."/ >}</Card></>; }
function Reports({ data, income, expenses, expenseByCategory, maxCategory }: any) { const total=income+expenses; return <><PageTitle eyebrow="ENTENDA SEUS HÁBITOS" title="Relatórios" subtitle="Uma visão mais clara das suas movimentações registradas."/><div className="summary-grid three"><div className="metric-card"><span>Receitas</span><strong className="positive">{money(income)}</strong><small>Total registrado</small></div><div className="metric-card"><span>Despesas</span><strong className="negative">{money(expenses)}</strong><small>Total registrado</small></div><div className="metric-card"><span>Saldo</span><strong>{money(income-expenses)}</strong><small>Receitas menos despesas</small></div></div><div className="dashboard-grid"><Card><div className="card-heading"><div><h3>Distribuição das despesas</h3><p>Participação de cada categoria</p></div></div>{Object.entries(expenseByCategory).length ? <div className="category-bars">{Object.entries(expenseByCategory).sort((a:any,b:any)=>b[1]-a[1]).map(([cat,val]:any,i)=><div className="bar-row" key={cat}><div className="bar-label"><span>{cat}</span><strong>{money(val)} · {expenses?Math.round(val/expenses*100):0}%</strong></div><div className="bar-track"><div className={`bar-fill color-${i%5}`} style={{width:`${val/maxCategory*100}%`}}/></div></div>)}</div>:<Empty text="Ainda não há despesas para analisar."/>}</Card><Card><div className="card-heading"><div><h3>Visão do período</h3><p>Proporção entre entradas e saídas</p></div></div><div className="report-donut" style={{background:`conic-gradient(#3f795b 0 ${total?income/total*100:0}%, #e9a16d ${total?income/total*100:0}% 100%)`}}><div><strong>{total?Math.round(income/total*100):0}%</strong><small>receitas</small></div></div><div className="legend"><span><i className="dot green"/> Receitas</span><span><i className="dot orange"/> Despesas</span></div></Card></div><Card><h3>Resumo de metas</h3><p className="muted">Você possui {data.goals.length} meta(s), com {money(data.goals.reduce((s:number,g:Goal)=>s+g.saved,0))} reservados.</p></Card></>; }
function Learning() { const [opened,setOpened]=useState<number|null>(null); const lessons=[["Como montar um orçamento","Comece listando todas as fontes de renda e despesas. Separe gastos essenciais, compromissos e desejos. Defina limites realistas e revise seu orçamento ao longo do mês."],["O que é uma reserva de emergência?","É um valor reservado para imprevistos. O tamanho ideal depende da sua realidade, estabilidade de renda e despesas essenciais. Comece com pequenas quantias e mantenha o dinheiro acessível."],["Como entender suas dívidas","Liste valores, taxas, parcelas e vencimentos. Priorize compreender o custo total de cada dívida e procure negociar condições que caibam no orçamento."],["Consumo consciente","Antes de comprar, avalie a necessidade, compare opções e considere o impacto no seu orçamento. Evite tomar decisões apenas por impulso."],["Primeiros passos para aprender sobre investimentos","Conheça conceitos como risco, liquidez, prazo e diversificação. Antes de investir, organize seu orçamento e entenda seus objetivos. Conteúdo educativo não substitui orientação profissional."]]; return <><PageTitle eyebrow="CONHECIMENTO QUE TRANSFORMA" title="Educação financeira" subtitle="Aprenda no seu ritmo e tome decisões mais conscientes."/><div className="learning-hero"><div><span className="eyebrow">APRENDER TAMBÉM É INVESTIR</span><h2>Conhecimento é uma ferramenta para o seu futuro.</h2><p>Explore conteúdos simples para desenvolver sua organização financeira.</p></div><div className="learning-art">✳</div></div><div className="lesson-list">{lessons.map(([title,body],i)=><Card key={title}><button className="lesson-button" onClick={()=>setOpened(opened===i?null:i)}><span className="lesson-number">0{i+1}</span><strong>{title}</strong><span>{opened===i?"−":"＋"}</span></button>{opened===i&&<p className="lesson-body">{body}</p>}</Card>)}</div></>; }
function Settings({ user, onLogout, onReset }: any) { return <><PageTitle eyebrow="SUA CONTA" title="Configurações" subtitle="Gerencie suas informações e preferências."/><Card><div className="settings-profile"><div className="avatar large">{user.name.charAt(0).toUpperCase()}</div><div><h3>{user.name}</h3><p>{user.email}</p><span className="category-pill">Conta pessoal</span></div></div></Card><Card><h3>Preferências</h3><div className="settings-row"><div><strong>Moeda</strong><small>Moeda utilizada nos registros</small></div><span>Real brasileiro (R$)</span></div><div className="settings-row"><div><strong>Armazenamento</strong><small>Dados salvos neste navegador</small></div><span>Local</span></div></Card><Card><h3>Gerenciar dados</h3><p className="muted">Você pode reiniciar seus registros financeiros deste dispositivo.</p><button className="btn-light danger-outline" onClick={onReset}>Reiniciar dados financeiros</button></Card><Card className="logout-card"><div><h3>Sair da conta</h3><p className="muted">Encerre sua sessão neste dispositivo.</p></div><button className="btn-danger" onClick={onLogout}>↪ Sair da conta</button></Card><p className="settings-note">MeuBolso • Versão demonstrativa 1.0</p></>; }
function Empty({ text }: { text: string }) { return <div className="empty-state"><span>◌</span><p>{text}</p></div>; }
function Modal({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal"><div className="modal-heading"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</div></div>; }
export default App;
