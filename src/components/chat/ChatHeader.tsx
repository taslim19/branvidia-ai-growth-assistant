"use client";
import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FlowProgress } from "./FlowProgress";
export function ChatHeader({step, midConversation, onRestart, lastReport}: {
  step:number; midConversation:boolean; onRestart:()=>void; lastReport:string|null;
}) {
  const [confirm,setConfirm]=useState(false);
  return <>
    <div className="shrink-0 border-b border-line px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Chat with Branvi</p>
        <button type="button" className="min-h-[44px] rounded-full px-3 text-sm font-medium text-violet-fg hover:bg-mist" onClick={()=>midConversation?setConfirm(true):onRestart()}>Start over</button>
      </div>
      <FlowProgress step={step}/>
      {lastReport ? <div className="mt-3 rounded-xl border border-line bg-mist p-3">
        <p className="text-sm font-semibold">Your last report is ready</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Link className="inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-medium text-violet-fg" href={`/report/${lastReport}`}>View report</Link>
          <button type="button" className="min-h-[44px] rounded-full px-3 text-sm font-medium text-violet-fg" onClick={()=>midConversation?setConfirm(true):onRestart()}>Start a new chat</button>
        </div>
      </div>:null}
    </div>
    <Modal open={confirm} onClose={()=>setConfirm(false)} title="Start a new chat?">
      <p className="text-sm text-slate">This clears your current conversation. Your saved reports stay available.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={()=>{setConfirm(false);onRestart();}}>Start over</Button>
        <Button variant="secondary" onClick={()=>setConfirm(false)}>Keep chatting</Button>
      </div>
    </Modal>
  </>;
}
