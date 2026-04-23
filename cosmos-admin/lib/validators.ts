import { z } from 'zod'

export const UserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'parent', 'teacher', 'super_admin']).optional(),
  institute_id: z.string().uuid('Invalid institute ID').optional(),
})

export const NoticeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  institute_id: z.string().uuid('Invalid institute ID'),
})

// More schemas can be added here
