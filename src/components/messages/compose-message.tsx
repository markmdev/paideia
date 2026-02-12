'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Contact {
  id: string
  name: string
  role: string
}

const roleLabels: Record<string, string> = {
  teacher: 'Teacher',
  sped_teacher: 'SPED Teacher',
  parent: 'Parent',
  admin: 'Admin',
  student: 'Student',
}

export function ComposeMessage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [sending, setSending] = useState(false)
  const [receiverId, setReceiverId] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (open) {
      setLoadingContacts(true)
      fetch('/api/messages/contacts')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setContacts(data)
          }
        })
        .catch(() => {
          toast.error('Failed to load contacts')
        })
        .finally(() => setLoadingContacts(false))
    }
  }, [open])

  function resetForm() {
    setReceiverId('')
    setSubject('')
    setContent('')
  }

  async function handleSend() {
    if (!receiverId) {
      toast.error('Please select a recipient')
      return
    }
    if (!content.trim()) {
      toast.error('Please enter a message')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId,
          subject: subject.trim() || null,
          content: content.trim(),
          type: 'general',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send message')
      }

      toast.success('Message sent')
      resetForm()
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to send message'
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white">
          <PenLine className="size-4" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">To</Label>
            {loadingContacts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="size-4 animate-spin" />
                Loading contacts...
              </div>
            ) : contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No contacts available
              </p>
            ) : (
              <Select value={receiverId} onValueChange={setReceiverId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a recipient" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}{' '}
                      <span className="text-muted-foreground">
                        ({roleLabels[contact.role] ?? contact.role})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Optional subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Message</Label>
            <Textarea
              id="content"
              placeholder="Write your message..."
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSend}
              disabled={sending || loadingContacts}
            >
              {sending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
