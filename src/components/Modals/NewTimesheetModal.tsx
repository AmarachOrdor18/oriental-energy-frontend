import { X, Calendar as CalendarIcon, Clock, BookOpen } from 'lucide-react';
import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export default function NewTimesheetModal({ isOpen, onClose, initialDate }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logDate, setLogDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [selectedProject, setSelectedProject] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // In a real app, this would hit the API: /api/v1/timesheets/log-daily
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
      // Reset form
      setHours('');
      setNotes('');
    }, 1000);
  };

  const projects = [
    { id: 'PRJ-2000', name: 'Drilling Operation A', code: 'DO-A' },
    { id: 'PRJ-2001', name: 'Logistics Support - Port', code: 'LOG-P' },
    { id: 'PRJ-2002', name: 'Rig 7 Maintenance', code: 'RIG-7-M' },
    { id: 'PRJ-2003', name: 'Corporate HR Review', code: 'HR-REV' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border_color w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border_color bg-background/50">
          <div>
            <h2 className="text-xl font-black text-text_primary tracking-tight">Daily Hour Log</h2>
            <p className="text-xs text-text_secondary font-medium">Record your daily activity for project allocation.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-text_secondary hover:bg-border_light hover:text-text_primary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-text_secondary uppercase tracking-widest">Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-800" />
                <input 
                  type="date" 
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full bg-background border border-border_color rounded-xl pl-10 pr-4 py-3 text-sm text-text_primary focus:outline-none focus:border-navy-800 focus:ring-4 focus:ring-navy-800/5 transition-all font-bold" 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-text_secondary uppercase tracking-widest">Hours Logged</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-800" />
                <input 
                  type="number" 
                  step="0.5" 
                  min="0"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-background border border-border_color rounded-xl pl-10 pr-4 py-3 text-sm text-text_primary focus:outline-none focus:border-navy-800 focus:ring-4 focus:ring-navy-800/5 transition-all font-bold" 
                  required 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-text_secondary uppercase tracking-widest">Project</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-800" />
              <select 
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full bg-background border border-border_color rounded-xl pl-10 pr-4 py-3 text-sm text-text_primary focus:outline-none focus:border-navy-800 focus:ring-4 focus:ring-navy-800/5 transition-all font-bold appearance-none cursor-pointer" 
                required
              >
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-text_secondary uppercase tracking-widest">Work Description</label>
            <textarea 
              rows={3} 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you work on today?" 
              className="w-full bg-background border border-border_color rounded-xl px-4 py-3 text-sm text-text_primary focus:outline-none focus:border-navy-800 focus:ring-4 focus:ring-navy-800/5 transition-all font-medium resize-none"
            ></textarea>
          </div>

          <div className="pt-6 flex items-center justify-between gap-4 border-t border-border_color">
            <button type="button" onClick={onClose} className="text-sm font-bold text-text_secondary hover:text-text_primary transition-colors">
              Discard
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-8 py-3 bg-navy-800 hover:bg-primary_dark text-white rounded-xl text-sm font-black transition-all shadow-xl shadow-navy-900/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                   <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   Saving...
                </>
              ) : 'Post Daily Hours'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
