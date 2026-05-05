declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    NEXT_PUBLIC_MIXPANEL_TOKEN?: string;
    NEXT_PUBLIC_GA_MEASUREMENT_ID?: string;
    NEXT_PUBLIC_INTERCOM_APP_ID?: string;
    BACKEND_URL?: string;
  }
}
