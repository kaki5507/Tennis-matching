// app/matches/[id]/MatchChatRoom.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMatchChats, sendMatchChat } from "@/app/actions/chat";

// 서버에서 막 도착했을 때의 데이터 모양 (날짜가 문자열일 수 있음)
interface RawChatMessage {
  id: string;
  message: string;
  createdAt: string | Date; 
  userId: string;
  user: { nickname: string | null };
}

// 화면에 그릴 때의 데이터 모양 (날짜를 진짜 Date 객체로 변환 완료)
interface ChatMessage {
  id: string;
  message: string;
  createdAt: Date;
  userId: string;
  user: { nickname: string | null };
}

interface MatchChatRoomProps {
  matchId: string;
  currentUserId: string;
}

export default function MatchChatRoom({ matchId, currentUserId }: MatchChatRoomProps) {
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. 메시지 전송 후 화면 갱신용 (any 대신 RawChatMessage 사용!)
  const fetchChatsForAction = async () => {
    const res = await getMatchChats(matchId);
    if (res.success && res.chats) {
      setChats(res.chats.map((chat: RawChatMessage) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
      })));
    }
  };

  // 2. 실시간 감지용 useEffect
  useEffect(() => {
    let isMounted = true;

    const pollChats = async () => {
      const res = await getMatchChats(matchId);
      if (res.success && res.chats && isMounted) {
        // any 대신 RawChatMessage 사용!
        setChats(res.chats.map((chat: RawChatMessage) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
        })));
      }
    };

    pollChats(); // 최초 1회 실행

    const interval = setInterval(() => {
      pollChats(); // 3초마다 반복 실행
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [matchId]);

  // 3. 메시지가 추가될 때마다 맨 아래로 스크롤 이동
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chats]);

  // 4. 메시지 전송 로직
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || isSending) return;

    setIsSending(true);
    const res = await sendMatchChat(matchId, currentUserId, message);
    
    if (res.success) {
      setMessage(""); 
      await fetchChatsForAction(); 
    } else {
      alert(res.error);
    }
    setIsSending(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
      {/* 채팅창 헤더 */}
      <div className="bg-indigo-600 px-6 py-4">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          💬 참여자 전용 실시간 채팅방
        </h3>
        <p className="text-indigo-200 text-sm">코트 번호와 세부 일정을 조율해 보세요!</p>
      </div>

      {/* 채팅 내역 영역 */}
      <div 
        ref={scrollRef} 
        className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-4"
      >
        {chats.length === 0 ? (
          <div className="text-center text-slate-400 mt-20">
            아직 작성된 메시지가 없습니다.<br/>첫 인사를 건네보세요! 👋
          </div>
        ) : (
          chats.map((chat) => {
            const isMe = chat.userId === currentUserId;
            
            return (
              <div key={chat.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {/* 닉네임 (남일 때만 표시) */}
                {!isMe && (
                  <span className="text-xs font-bold text-slate-500 mb-1 ml-1">
                    {chat.user.nickname || "알 수 없음"}
                  </span>
                )}
                
                {/* 말풍선 */}
                <div 
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] shadow-sm ${
                    isMe 
                      ? "bg-indigo-600 text-white rounded-tr-sm" 
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                  }`}
                >
                  {chat.message}
                </div>
                
                {/* 시간 */}
                <span className="text-[10px] text-slate-400 mt-1 mx-1">
                  {chat.createdAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* 입력 영역 */}
      <form 
        onSubmit={handleSend} 
        className="p-4 bg-white border-t border-slate-100 flex gap-2"
      >
        <Input 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500"
        />
        <Button 
          type="submit" 
          disabled={isSending || !message.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
        >
          {isSending ? "..." : "전송"}
        </Button>
      </form>
    </div>
  );
}