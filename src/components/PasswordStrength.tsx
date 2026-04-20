interface Props {
  password: string;
}

const getStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;

  if (score <= 1) return { score, label: 'Zayıf', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Orta', color: 'bg-yellow-500' };
  if (score === 3) return { score, label: 'İyi', color: 'bg-brand-400' };
  return { score, label: 'Güçlü', color: 'bg-brand-400' };
};

export const PasswordStrength = ({ password }: Props) => {
  const { score, label, color } = getStrength(password);

  if (!password) return null;

  return (
    <div className="flex items-center gap-2 mt-1 animate-fade-in">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? color : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-body font-medium ${
        score <= 1 ? 'text-red-400' :
        score === 2 ? 'text-yellow-400' :
        'text-brand-400'
      }`}>
        {label}
      </span>
    </div>
  );
};
