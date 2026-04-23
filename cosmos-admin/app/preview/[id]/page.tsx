import { createClient } from '@supabase/supabase-js'
import PreviewClient from './PreviewClient'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data } = await supabase.from('institutes').select('name, tagline').eq('id', params.id).single()

  if (!data) {
    return {
      title: 'Institute Profile - Cosmos',
    }
  }

  return {
    title: `${data.name} | Cosmos Partner Institution`,
    description: data.tagline || `Enroll at ${data.name}, powered by Cosmos Tutorials platform.`,
  }
}

export default function Page({ params }: { params: { id: string } }) {
  return <PreviewClient params={params} />
}
