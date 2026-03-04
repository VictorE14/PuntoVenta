import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

export const supabase = createClient(
    'https://oxylclrzmqeyduayotwi.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWxjbHJ6bXFleWR1YXlvdHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjA0NzQsImV4cCI6MjA4ODAzNjQ3NH0._9GVYGiXmNfTEhjKJuikZdObZBuGn11TMuWJeaRXOcs'
)
