import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { LoginBrandMark } from './LoginBrandMark';

interface LoginFormProps {
  onSubmit: (username: string, password: string) => Promise<void>;
  error?: string | null;
  loading?: boolean;
}

export function LoginForm({ onSubmit, error, loading = false }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('crm_remember_user');
    if (saved) {
      setUsername(saved);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (remember) localStorage.setItem('crm_remember_user', username.trim());
    else localStorage.removeItem('crm_remember_user');
    await onSubmit(username.trim(), password);
  };

  return (
    <div className="login-anim-form w-full max-w-[400px]">
      <div className="mb-10 lg:hidden">
        <LoginBrandMark size="large" />
      </div>

      <div className="hidden lg:block">
        <p className="m-0 text-[12px] font-medium tracking-[0.14em] text-[#667488] uppercase">
          Welcome back
        </p>
      </div>

      <h1 className="m-0 mt-3 text-[30px] font-semibold leading-9 tracking-[-0.03em] text-[#1e242c]">
        Sign in
      </h1>
      <p className="m-0 mt-2 text-[14px] leading-6 text-[#667488]">
        Access your AutoAxis workspace with your credentials.
      </p>

      <form onSubmit={handleSubmit} className="mt-9 space-y-5">
        <div className="login-anim-field login-anim-field-1 space-y-2">
          <label htmlFor="username" className="block text-[13px] font-medium text-[#3d4654]">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            autoFocus
            placeholder="Enter username"
            className="login-input h-12 w-full rounded-lg border border-[#d8dde5] bg-[#fbfcfd] px-3.5 text-[14px] text-[#1e242c] outline-none placeholder:text-[#9aa3b2] focus:border-[#1a73e8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(26,115,232,0.1)]"
          />
        </div>

        <div className="login-anim-field login-anim-field-2 space-y-2">
          <label htmlFor="password" className="block text-[13px] font-medium text-[#3d4654]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter password"
              className="login-input h-12 w-full rounded-lg border border-[#d8dde5] bg-[#fbfcfd] py-0 pr-12 pl-3.5 text-[14px] text-[#1e242c] outline-none placeholder:text-[#9aa3b2] focus:border-[#1a73e8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(26,115,232,0.1)]"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[#667488] transition-colors hover:bg-[#eef1f5] hover:text-[#1e242c]"
              tabIndex={-1}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-[13px] text-[#576579]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-[15px] rounded-[3px] border-[#c5ccd6] accent-[#1a73e8]"
            />
            Keep me signed in
          </label>
        </div>

        {error ? (
          <p
            role="alert"
            className="login-error-anim m-0 rounded-lg border border-[#efd0d0] bg-[#fff8f8] px-3.5 py-3 text-[13px] leading-5 text-[#b42318]"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="login-anim-field login-anim-field-3 login-btn mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1a73e8] text-[14px] font-semibold tracking-[-0.01em] text-white shadow-[0_1px_2px_rgba(16,24,40,0.06),0_8px_20px_rgba(26,115,232,0.28)] hover:bg-[#1664cc] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in…
            </>
          ) : (
            'Continue'
          )}
        </button>
      </form>

      <p className="m-0 mt-10 text-[12px] leading-5 text-[#8a94a6]">
        Protected workspace for authorized AutoAxis staff only.
      </p>
    </div>
  );
}
