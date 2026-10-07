import type {Metadata} from 'next';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './globals.css';
import './responsive.css';
import './editorial.css';
import './discovery.css';
import {Header,Footer} from '@/components/shell';
import {hasDatabase} from '@/lib/config';
export const metadata:Metadata={title:{default:'tinitix — Konser pilihan. Malam yang ditunggu.',template:'%s | tinitix'},description:'Temukan konser dan party, pilih tiketmu, dan terima e-ticket langsung di email.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body><Header demo={!hasDatabase()}/><main id="main">{children}</main><Footer/></body></html>;}
