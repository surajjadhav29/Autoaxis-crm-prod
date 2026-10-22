import { LoginBrandMark } from './LoginBrandMark';
import { RunningCar } from './RunningCar';

export function LoginBrandingPanel() {
  return (
    <aside className="login-anim-panel relative hidden overflow-hidden lg:block">
      <img
        src="/login-hero.jpg"
        alt=""
        className="login-hero-pan absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-[#0f1419]/55" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a73e8]/25 via-transparent to-[#0f1419]/40" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'linear-gradient(180deg, black, transparent 85%)',
        }}
      />

      <div className="relative z-10 flex h-full min-h-screen flex-col justify-between p-12 xl:p-16">
        <div className="login-anim-brand inline-flex w-fit flex-col rounded-xl bg-white/95 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm">
          <LoginBrandMark size="large" />
        </div>

        <div className="login-anim-brand-delay-1 max-w-[420px]">
          <div className="mb-6 h-px w-12 bg-[#1a73e8]" />
          <p className="m-0 text-[12px] font-medium tracking-[0.18em] text-white/70 uppercase">
            Enterprise CRM
          </p>
          <h1 className="m-0 mt-4 text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] text-white xl:text-[44px]">
            Where Vehicles Meet compliance
          </h1>
          <p className="m-0 mt-5 max-w-[360px] text-[15px] leading-6 text-white/65">
            Built for RTO operations, dealers, and compliance teams who need clarity at every step.
          </p>
        </div>

        <div className="login-anim-brand-delay-2 relative">
          <RunningCar className="mb-8" />
          <div className="flex items-center gap-6 text-[12px] text-white/45">
            <span>Secure access</span>
            <span className="size-1 rounded-full bg-white/30" />
            <span>Role-based control</span>
            <span className="size-1 rounded-full bg-white/30" />
            <span>Live status tracking</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
