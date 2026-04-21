'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { getUserProfileService } from '../../lib/userProfileService';
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  Hash,
  Home,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import styles from './page.module.scss';

type AuthMode = 'login' | 'signup' | 'company';
type CompanyMode = 'login' | 'signup';
type SignupRole = 'student' | 'professor' | 'coordinator';

const mapFirebaseErrorMessage = (code: string) => {
  switch (code) {
    case 'auth/wrong-password':
      return 'A senha informada está incorreta.';
    case 'auth/user-not-found':
      return 'Não encontramos uma conta com esse email.';
    case 'auth/invalid-email':
      return 'O email informado não é válido.';
    case 'auth/email-already-in-use':
      return 'Já existe uma conta registrada com esse email.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde.';
    case 'auth/network-request-failed':
      return 'Falha de conexão. Verifique sua internet e tente novamente.';
    default:
      return 'Ocorreu um erro durante a autenticação. Tente novamente.';
  }
};

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [signupRole, setSignupRole] = useState<SignupRole>('student');
  const [course, setCourse] = useState('');
  const [registration, setRegistration] = useState('');
  const [department, setDepartment] = useState('');
  const [focus, setFocus] = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [companyMode, setCompanyMode] = useState<CompanyMode>('login');
  const [companyName, setCompanyName] = useState('');
  const [companyLegalName, setCompanyLegalName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companySegment, setCompanySegment] = useState('');
  const [companyContactName, setCompanyContactName] = useState('');
  const [companyContactRole, setCompanyContactRole] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const isAcademicSignup = authMode === 'signup';
  const isCompanySignup = authMode === 'company' && companyMode === 'signup';
  const heroImage = isAcademicSignup || isCompanySignup ? '/img/Register.gif' : '/img/Login.gif';
  const cardMotionClass =
    authMode === 'login'
      ? styles.cardMotionLogin
      : authMode === 'signup'
        ? styles.cardMotionSignup
        : styles.cardMotionCompany;

  const resetSharedFeedback = () => {
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    resetSharedFeedback();

    const isCompanyFlow = authMode === 'company';
    const isCompanySignupFlow = isCompanyFlow && companyMode === 'signup';
    const isAcademicSignupFlow = authMode === 'signup';
    const requiresAcademicDetails = isAcademicSignupFlow;
    const requiresCompanyDetails = isCompanySignupFlow;

    if (!email.trim() || !password) {
      setFeedback({ type: 'error', message: 'Preencha todos os campos necessários.' });
      return;
    }

    if (requiresAcademicDetails) {
      if (!username.trim() || !phone.trim() || !course.trim() || !registration.trim()) {
        setFeedback({ type: 'error', message: 'Preencha os dados de cadastro para continuar.' });
        return;
      }

      if (signupRole !== 'student' && (!department.trim() || !focus.trim() || !officeHours.trim())) {
        setFeedback({ type: 'error', message: 'Preencha todos os campos necessários para professores e coordenação.' });
        return;
      }

      if (password !== confirmPassword) {
        setFeedback({ type: 'error', message: 'As senhas não coincidem.' });
        return;
      }

      if (!agreeTerms) {
        setFeedback({ type: 'error', message: 'Você deve concordar com os Termos de Serviço.' });
        return;
      }
    }

    if (requiresCompanyDetails) {
      if (
        !companyName.trim() ||
        !companyLegalName.trim() ||
        !companyCnpj.trim() ||
        !companySegment.trim() ||
        !companyContactName.trim() ||
        !companyContactRole.trim() ||
        !companyPhone.trim() ||
        !companyDescription.trim()
      ) {
        setFeedback({ type: 'error', message: 'Preencha os dados da empresa para continuar.' });
        return;
      }

      if (password !== confirmPassword) {
        setFeedback({ type: 'error', message: 'As senhas não coincidem.' });
        return;
      }

      if (!agreeTerms) {
        setFeedback({ type: 'error', message: 'Você deve concordar com os Termos de Serviço.' });
        return;
      }
    }

    setLoading(true);

    try {
      if (requiresAcademicDetails) {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (userCredential.user && username.trim()) {
          await updateProfile(userCredential.user, { displayName: username.trim() });
        }

        await getUserProfileService().createUserProfile(userCredential.user.uid, email.trim(), username.trim(), undefined, {
          role: signupRole,
          phoneNumber: phone.trim(),
          course: course.trim(),
          registration: registration.trim(),
          academicDepartment: signupRole === 'student' ? '' : department.trim(),
          academicFocus: signupRole === 'student' ? '' : focus.trim(),
          professionalSummary:
            signupRole === 'student'
              ? 'Perfil acadêmico de aluno.'
              : signupRole === 'coordinator'
                ? 'Perfil da coordenação com privilégios acadêmicos equivalentes aos docentes.'
                : 'Perfil de professor orientador.',
        });
      } else if (requiresCompanyDetails) {
        const companyDisplayName = companyName.trim();
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(userCredential.user, { displayName: companyDisplayName });

        await getUserProfileService().createUserProfile(userCredential.user.uid, email.trim(), companyDisplayName, undefined, {
          role: 'company',
          companyName: companyDisplayName,
          companyLegalName: companyLegalName.trim(),
          companyCnpj: companyCnpj.trim(),
          companySegment: companySegment.trim(),
          companyContactName: companyContactName.trim(),
          companyContactRole: companyContactRole.trim(),
          companyPhone: companyPhone.trim(),
          companyWebsite: companyWebsite.trim(),
          companyDescription: companyDescription.trim(),
          phoneNumber: companyPhone.trim(),
          professionalSummary: companyDescription.trim(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      router.push('/');
    } catch (error) {
      if (error instanceof FirebaseError) {
        setFeedback({ type: 'error', message: mapFirebaseErrorMessage(error.code) });
      } else {
        setFeedback({ type: 'error', message: 'Falha ao processar sua solicitação. Tente novamente.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setFeedback({ type: 'error', message: 'Digite seu email para recuperar a senha.' });
      return;
    }

    resetSharedFeedback();
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setFeedback({ type: 'success', message: 'Email de recuperação enviado. Verifique sua caixa de entrada.' });
    } catch (error) {
      if (error instanceof FirebaseError) {
        setFeedback({ type: 'error', message: mapFirebaseErrorMessage(error.code) });
      } else {
        setFeedback({ type: 'error', message: 'Não foi possível enviar o email de recuperação. Tente novamente.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.overlay} />

      <div className={styles.shell}>
        <div className={styles.heroPanel}>
          <div className={styles.heroGlow} />
          <div className={styles.heroOrbOne} />
          <div className={styles.heroOrbTwo} />

          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <Sparkles size={16} />
              <span>Ambiente acadêmico e empresarial</span>
            </div>

            <div className={styles.heroIconWrap}>
              <img key={heroImage} src={heroImage} alt="Choas" className={styles.heroIcon} />
            </div>

            <p className={styles.heroText}>
              Uma experiência de acesso moderna para alunos, orientadores e empresas parceiras.
            </p>
          </div>
        </div>

        <div className={styles.formPanel}>
          <Link href="/" className={styles.homeButton} title="Voltar para home">
            <Home size={24} />
          </Link>

          <div className={styles.modeSwitch}>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`${styles.modeButton} ${authMode === 'login' ? styles.modeButtonActive : ''}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`${styles.modeButton} ${authMode === 'signup' ? styles.modeButtonActive : ''}`}
            >
              Cadastrar
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setAuthMode('company');
              setCompanyMode('login');
            }}
            className={`${styles.companyEntryButton} ${authMode === 'company' ? styles.companyEntryButtonActive : ''}`}
          >
            <Building2 size={18} />
            <span>Sou Empresa</span>
          </button>

          {authMode === 'company' && (
            <div className={styles.companyModeSwitch}>
              <button
                type="button"
                onClick={() => setCompanyMode('login')}
                className={`${styles.companyModeButton} ${companyMode === 'login' ? styles.companyModeButtonActive : ''}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setCompanyMode('signup')}
                className={`${styles.companyModeButton} ${companyMode === 'signup' ? styles.companyModeButtonActive : ''}`}
              >
                Cadastrar empresa
              </button>
            </div>
          )}

          <div className={styles.formViewport}>
            <div
              key={`${authMode}-${authMode === 'company' ? companyMode : 'default'}`}
              className={`${styles.card} ${styles.cardIntro} ${authMode === 'company' ? styles.cardCompany : ''} ${cardMotionClass}`}
            >
              <div className={styles.cardHeader}>
                {authMode === 'company' && (
                  <div className={styles.modeMiniBadge}>
                    <Building2 size={16} />
                    <span>Área empresarial</span>
                  </div>
                )}
                <p className={styles.cardKicker}>
                  {authMode === 'company'
                    ? companyMode === 'signup'
                      ? 'Cadastro empresarial'
                      : 'Acesso empresarial'
                    : authMode === 'signup'
                      ? 'Cadastro institucional'
                      : 'Acesso padrão'}
                </p>
                <h1 className={styles.cardTitle}>
                  {authMode === 'company'
                    ? companyMode === 'signup'
                      ? 'Cadastrar empresa'
                      : 'Entrar como empresa'
                    : authMode === 'signup'
                      ? 'Criar Conta'
                      : 'Entrar'}
                </h1>
                <p className={styles.cardSubtitle}>
                  {authMode === 'company'
                    ? companyMode === 'signup'
                      ? 'Crie o acesso institucional da empresa para acompanhar projetos, entregas e vínculos com a faculdade.'
                      : 'Acompanhe projetos, entregas e o progresso dos alunos.'
                    : authMode === 'signup'
                      ? 'Cadastre alunos, professores e coordenação com uma transição suave.'
                      : 'Acesse sua conta com uma animação mais fluida e elegante.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className={styles.formBody}>
                {authMode === 'login' ? (
                  <>
                    <div className={styles.field}>
                      <Mail className={styles.fieldIcon} size={20} />
                      <input
                        type="text"
                        placeholder="Email ou Telefone"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <Lock className={styles.fieldIcon} size={20} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${styles.input} ${styles.inputWithAction}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={styles.toggleIcon}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>

                    <div className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        id="keepLoggedIn"
                        checked={keepLoggedIn}
                        onChange={(e) => setKeepLoggedIn(e.target.checked)}
                      />
                      <label htmlFor="keepLoggedIn">Manter conectado</label>
                    </div>

                    <button type="submit" className={styles.primaryButton} disabled={loading}>
                      <span>{loading ? 'Entrando...' : 'Entrar'}</span>
                      <ArrowRight size={20} />
                    </button>

                    <div className={styles.inlineActionRow}>
                      <button type="button" onClick={handleForgotPassword} className={styles.linkButton}>
                        Esqueceu a senha?
                      </button>
                    </div>
                  </>
                ) : authMode === 'signup' ? (
                  <>
                    <div className={styles.field}>
                      <User className={styles.fieldIcon} size={20} />
                      <input
                        type="text"
                        placeholder="Nome Completo"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <Mail className={styles.fieldIcon} size={20} />
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <Phone className={styles.fieldIcon} size={20} />
                      <input
                        type="tel"
                        placeholder="Telefone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>

                    <div className={styles.selectField}>
                      <select
                        value={signupRole}
                        onChange={(e) => setSignupRole(e.target.value as SignupRole)}
                        className={`${styles.input} ${styles.select}`}
                      >
                        <option value="student">Aluno</option>
                        <option value="professor">Professor orientador</option>
                        <option value="coordinator">Coordenação</option>
                      </select>
                      <User className={styles.fieldIcon} size={20} />
                      <span className={styles.selectArrow}>▾</span>
                    </div>

                    <p className={styles.inlineHint}>Cadastro acadêmico para alunos, professores e coordenação.</p>

                    <div className={styles.field}>
                      <GraduationCap className={styles.fieldIcon} size={20} />
                      <input
                        type="text"
                        placeholder="Curso"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <Hash className={styles.fieldIcon} size={20} />
                      <input
                        type="text"
                        placeholder="Matrícula"
                        value={registration}
                        onChange={(e) => setRegistration(e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>

                    {signupRole !== 'student' && (
                      <div className={styles.professorStack}>
                        <p className={styles.inlineHintStrong}>
                          Acesso de professor e coordenação libera dashboard multi-equipes e permissões acadêmicas avançadas.
                        </p>

                        <input
                          type="text"
                          placeholder="Departamento ou área"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className={styles.input}
                          required
                        />

                        <input
                          type="text"
                          placeholder="Foco acadêmico"
                          value={focus}
                          onChange={(e) => setFocus(e.target.value)}
                          className={styles.input}
                          required
                        />

                        <input
                          type="text"
                          placeholder="Janela de atendimento"
                          value={officeHours}
                          onChange={(e) => setOfficeHours(e.target.value)}
                          className={styles.input}
                          required
                        />
                      </div>
                    )}

                    <div className={styles.field}>
                      <Lock className={styles.fieldIcon} size={20} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${styles.input} ${styles.inputWithAction}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={styles.toggleIcon}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>

                    <div className={styles.field}>
                      <Lock className={styles.fieldIcon} size={20} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirmar Senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`${styles.input} ${styles.inputWithAction}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={styles.toggleIcon}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>

                    <div className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        id="agreeTerms"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                      />
                      <label htmlFor="agreeTerms">Concordo com os Termos de Serviço</label>
                    </div>

                    <button type="submit" className={styles.primaryButton} disabled={loading}>
                      <span>{loading ? 'Criando...' : 'Cadastrar'}</span>
                      <ArrowRight size={20} />
                    </button>
                  </>
                ) : companyMode === 'login' ? (
                  <>
                    <p className={styles.inlineHintStrong}>
                      Use o email corporativo cadastrado para acessar projetos, entregas e progresso dos alunos.
                    </p>

                    <div className={styles.field}>
                      <Mail className={styles.fieldIcon} size={20} />
                      <input
                        type="email"
                        placeholder="Email corporativo"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <Lock className={styles.fieldIcon} size={20} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${styles.input} ${styles.inputWithAction}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={styles.toggleIcon}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>

                    <div className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        id="keepLoggedIn"
                        checked={keepLoggedIn}
                        onChange={(e) => setKeepLoggedIn(e.target.checked)}
                      />
                      <label htmlFor="keepLoggedIn">Manter conectado</label>
                    </div>

                    <button type="submit" className={styles.primaryButton} disabled={loading}>
                      <span>{loading ? 'Entrando...' : 'Entrar na área empresarial'}</span>
                      <ArrowRight size={20} />
                    </button>

                    <div className={styles.inlineActionRow}>
                      <button type="button" onClick={handleForgotPassword} className={styles.linkButton}>
                        Esqueceu a senha?
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className={styles.inlineHintStrong}>
                      Faça o cadastro institucional da empresa para centralizar acesso e acompanhamento dos projetos.
                    </p>

                    <div className={styles.fieldGrid}>
                      <div className={styles.field}>
                        <Building2 className={styles.fieldIcon} size={20} />
                        <input
                          type="text"
                          placeholder="Nome fantasia"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className={styles.input}
                          required
                        />
                      </div>

                      <div className={styles.field}>
                        <Building2 className={styles.fieldIcon} size={20} />
                        <input
                          type="text"
                          placeholder="Razão social"
                          value={companyLegalName}
                          onChange={(e) => setCompanyLegalName(e.target.value)}
                          className={styles.input}
                          required
                        />
                      </div>
                    </div>

                    <div className={styles.fieldGrid}>
                      <div className={styles.field}>
                        <Hash className={styles.fieldIcon} size={20} />
                        <input
                          type="text"
                          placeholder="CNPJ"
                          value={companyCnpj}
                          onChange={(e) => setCompanyCnpj(e.target.value)}
                          className={styles.input}
                          required
                        />
                      </div>

                      <div className={styles.field}>
                        <GraduationCap className={styles.fieldIcon} size={20} />
                        <input
                          type="text"
                          placeholder="Segmento"
                          value={companySegment}
                          onChange={(e) => setCompanySegment(e.target.value)}
                          className={styles.input}
                          required
                        />
                      </div>
                    </div>

                    <div className={styles.fieldGrid}>
                      <div className={styles.field}>
                        <User className={styles.fieldIcon} size={20} />
                        <input
                          type="text"
                          placeholder="Nome do responsável"
                          value={companyContactName}
                          onChange={(e) => setCompanyContactName(e.target.value)}
                          className={styles.input}
                          required
                        />
                      </div>

                      <div className={styles.field}>
                        <User className={styles.fieldIcon} size={20} />
                        <input
                          type="text"
                          placeholder="Cargo do responsável"
                          value={companyContactRole}
                          onChange={(e) => setCompanyContactRole(e.target.value)}
                          className={styles.input}
                          required
                        />
                      </div>
                    </div>

                    <div className={styles.fieldGrid}>
                      <div className={styles.field}>
                        <Phone className={styles.fieldIcon} size={20} />
                        <input
                          type="tel"
                          placeholder="Telefone corporativo"
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          className={styles.input}
                          required
                        />
                      </div>

                      <div className={styles.field}>
                        <Mail className={styles.fieldIcon} size={20} />
                        <input
                          type="url"
                          placeholder="Site institucional"
                          value={companyWebsite}
                          onChange={(e) => setCompanyWebsite(e.target.value)}
                          className={styles.input}
                        />
                      </div>
                    </div>

                    <div className={styles.field}>
                      <textarea
                        placeholder="Descrição institucional"
                        value={companyDescription}
                        onChange={(e) => setCompanyDescription(e.target.value)}
                        className={styles.textarea}
                        rows={4}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <Mail className={styles.fieldIcon} size={20} />
                      <input
                        type="email"
                        placeholder="Email corporativo"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <Lock className={styles.fieldIcon} size={20} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${styles.input} ${styles.inputWithAction}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={styles.toggleIcon}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>

                    <div className={styles.field}>
                      <Lock className={styles.fieldIcon} size={20} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirmar senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`${styles.input} ${styles.inputWithAction}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={styles.toggleIcon}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>

                    <div className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        id="companyTerms"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                      />
                      <label htmlFor="companyTerms">Concordo com os Termos de Serviço</label>
                    </div>

                    <button type="submit" className={styles.primaryButton} disabled={loading}>
                      <span>{loading ? 'Cadastrando...' : 'Cadastrar empresa'}</span>
                      <ArrowRight size={20} />
                    </button>
                  </>
                )}
              </form>

              {feedback && (
                <div className={`${styles.feedback} ${feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess}`}>
                  {feedback.message}
                </div>
              )}

              <div className={styles.dividerRow}>
                <div className={styles.dividerLine} />
                <span>ou</span>
                <div className={styles.dividerLine} />
              </div>

              <div className={styles.socialRow}>
                <button type="button" className={styles.socialButton} title="Google">
                  <span className={styles.socialText}>G</span>
                </button>
                <button type="button" className={styles.socialButton} title="GitHub">
                  <span className={styles.socialText}>GH</span>
                </button>
              </div>

              {authMode !== 'company' && (
                <p className={styles.bottomLink}>
                  {authMode === 'login' ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  >
                    {authMode === 'login' ? 'Cadastre-se' : 'Entre'}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
