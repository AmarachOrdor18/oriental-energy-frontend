import { X, Briefcase, Clock, Shield } from 'lucide-react';
import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewProjectModal({ isOpen, onClose }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [maxHours, setMaxHours] = useState('40');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Mock API call
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border_color w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border_color bg-background/50">
          <div>
            <h2 className="text-xl font-black text-text_primary tracking-tight">Initialize New Project</h2>
            <p className="text-xs text-text_secondary font-medium uppercase tracking-wider">Departmental Project Setup</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-text_secondary hover:bg-border_light hover:text-text_primary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-text_secondary uppercase tracking-[0.2em]">Project Title</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pipeline Maintenance Phase 2"
                className="w-full bg-background border border-border_color rounded-xl pl-10 pr-4 py-3 text-sm text-text_primary focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold" 
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text_secondary uppercase tracking-[0.2em]">Project Code</label>
              <input 
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PIP-26"
                className="w-full bg-background border border-border_color rounded-xl px-4 py-3 text-sm text-text_primary focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold" 
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text_secondary uppercase tracking-[0.2em]">Weekly Hour Limit</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <input 
                  type="number" 
                  value={maxHours}
                  onChange={(e) => setMaxHours(e.target.value)}
                  className="w-full bg-background border border-border_color rounded-xl pl-10 pr-4 py-3 text-sm text-text_primary focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold" 
                  required 
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-start gap-3">
             <Shield className="h-5 w-5 text-primary mt-0.5" />
             <p className="text-[10px] text-text_secondary font-medium leading-relaxed uppercase">
                As a Department Head, you are authorized to create projects for your department. These projects will be immediately available to your team for time logging.
             </p>
          </div>

          <div className="pt-6 flex items-center justify-end gap-4 border-t border-border_color">
            <button type="button" onClick={onClose} className="text-sm font-bold text-text_secondary hover:text-text_primary transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-8 py-3 bg-primary hover:bg-primary_dark text-white rounded-xl text-sm font-black transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Launch Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
