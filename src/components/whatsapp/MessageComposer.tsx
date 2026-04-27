'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWhatsAppStatus } from '@/hooks/useWhatsAppStatus';
import { cn } from '@/lib/utils';

interface MessageComposerProps {
  conversationId: string;
}

const MAX_LENGTH = 4096;
const COUNT_THRESHOLD = 3500;

export function MessageComposer({ conversationId }: MessageComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { status } = useWhatsAppStatus();
  const isConnected = status?.state === 'connected';
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setText('');
  }, [conversationId]);

  // Auto-grow up to ~5 lines
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    const max = 24 * 5 + 16;
    node.style.height = `${Math.min(node.scrollHeight, max)}px`;
  }, [text]);

  const trimmed = text.trim();
  const disabled = !isConnected || sending;
  const canSubmit = !disabled && trimmed.length > 0 && trimmed.length <= MAX_LENGTH;

  const submit = async () => {
    if (!canSubmit) return;
    setSending(true);
    try {
      const response = await fetch(`/api/whatsapp/conversations/${conversationId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Erro ao enviar mensagem');
      }
      setText('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar mensagem';
      toast.error('Erro ao enviar', { description: message });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const composer = (
    <Textarea
      ref={textareaRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={
        isConnected ? 'Digite uma mensagem…' : 'WhatsApp desconectado'
      }
      disabled={disabled}
      maxLength={MAX_LENGTH}
      rows={1}
      className="min-h-10 resize-none"
    />
  );

  return (
    <div className="border-t bg-background p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          {!isConnected ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>{composer}</div>
                </TooltipTrigger>
                <TooltipContent>WhatsApp desconectado</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            composer
          )}
        </div>
        <Button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Enviar mensagem"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {trimmed.length >= COUNT_THRESHOLD ? (
        <p
          data-testid="char-count"
          className={cn(
            'mt-1 text-right text-[11px]',
            trimmed.length >= MAX_LENGTH ? 'text-red-600' : 'text-muted-foreground'
          )}
        >
          {trimmed.length}/{MAX_LENGTH}
        </p>
      ) : null}
    </div>
  );
}
