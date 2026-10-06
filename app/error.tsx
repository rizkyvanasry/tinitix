'use client';
import {EmptyState} from '@/components/shell';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="container page-space"><EmptyState title="Ada kendala saat memuat." description="Periksa koneksi internet atau coba lagi beberapa saat."/><button className="button centered" onClick={reset}>Coba lagi</button></div>;}
