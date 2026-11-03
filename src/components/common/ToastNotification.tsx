/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X, Cloud } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'sync';
  title: string;
  message?: string;
  timestamp?: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map(toast => {
        const iconConfig = {
          success: {
            icon: CheckCircle2,
            iconClass: 'text-emerald-500 dark:text-emerald-400',
            borderClass: 'border-emerald-200 dark:border-emerald-800/80',
            bgClass: 'bg-white/95 dark:bg-slate-900/95',
            barClass: 'bg-emerald-500',
          },
          sync: {
            icon: Cloud,
            iconClass: 'text-teal-500 dark:text-teal-400',
            borderClass: 'border-teal-200 dark:border-teal-800/80',
            bgClass: 'bg-white/95 dark:bg-slate-900/95',
            barClass: 'bg-teal-500',
          },
          info: {
            icon: Info,
            iconClass: 'text-blue-500 dark:text-blue-400',
            borderClass: 'border-blue-200 dark:border-blue-800/80',
            bgClass: 'bg-white/95 dark:bg-slate-900/95',
            barClass: 'bg-blue-500',
          },
          warning: {
            icon: AlertTriangle,
            iconClass: 'text-amber-500 dark:text-amber-400',
            borderClass: 'border-amber-200 dark:border-amber-800/80',
            bgClass: 'bg-white/95 dark:bg-slate-900/95',
            barClass: 'bg-amber-500',
          },
          error: {
            icon: XCircle,
            iconClass: 'text-rose-500 dark:text-rose-400',
            borderClass: 'border-rose-200 dark:border-rose-800/80',
            bgClass: 'bg-white/95 dark:bg-slate-900/95',
            barClass: 'bg-rose-500',
          },
        }[toast.type];

        const IconComponent = iconConfig.icon;

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 ${iconConfig.bgClass} ${iconConfig.borderClass}`}
          >
            <div className={`mt-0.5 shrink-0 ${iconConfig.iconClass}`}>
              <IconComponent className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {toast.title}
                </h4>
                {toast.timestamp && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                    {toast.timestamp}
                  </span>
                )}
              </div>
              {toast.message && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1 -mt-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
