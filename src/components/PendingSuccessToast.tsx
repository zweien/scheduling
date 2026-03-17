'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { consumeSuccessToast } from '@/lib/ui/success-toast';

export function PendingSuccessToast() {
  useEffect(() => {
    const message = consumeSuccessToast();
    if (!message) {
      return;
    }

    toast.success(message);
  }, []);

  return null;
}
