// app/matches/[id]/MatchComments.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { getComments, addComment } from "@/app/actions/comment";

interface CommentData {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    nickname: string | null;
    email: string;
  };
}

export default function MatchComments({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 1. 댓글만 다시 불러오는 함수 (댓글 작성 완료 후 사용)
  const loadComments = async () => {
    const result = await getComments(matchId);
    if (result.success && result.comments) {
      setComments(result.comments);
    }
  };

  // 2. 🌟 컴포넌트가 켜질 때 딱 한 번만 안전하게 실행되는 useEffect
  useEffect(() => {
    let isMounted = true; // 컴포넌트가 화면에 살아있는지 체크하는 변수

    const initData = async () => {
      // 비동기로 유저 정보 가져오기
      const { data } = await supabase.auth.getUser();
      
      // 비동기로 댓글 정보 가져오기
      const result = await getComments(matchId);

      // 데이터를 다 가져왔을 때, 컴포넌트가 아직 화면에 살아있을 때만 State 변경!
      // (이렇게 해야 React가 "안전한 비동기 업데이트구나" 하고 안심합니다)
      if (isMounted) {
        setCurrentUserId(data.user?.id || null);
        if (result.success && result.comments) {
          setComments(result.comments);
        }
      }
    };

    initData();

    // 클린업(Cleanup) 함수: 화면을 벗어나면 상태 업데이트를 중단시킴
    return () => {
      isMounted = false;
    };
  }, [matchId]); // 의존성 배열에는 깔끔하게 matchId 하나만 남깁니다.

  // 3. 댓글 등록 처리
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!currentUserId) {
      alert("로그인이 필요한 서비스입니다.");
      router.push("/login");
      return;
    }

    if (!newComment.trim()) return;

    setIsLoading(true);
    const result = await addComment(matchId, currentUserId, newComment);
    
    if (result.success) {
      setNewComment(""); // 입력창 비우기
      await loadComments(); // 최신 댓글 다시 불러오기
      router.refresh();
    } else {
      alert(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="mt-12 bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        💬 Q&A 및 소통 <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded-full text-sm">{comments.length}</span>
      </h3>

      {/* 댓글 목록 영역 */}
      <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
        {comments.length === 0 ? (
          <p className="text-slate-500 text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            아직 작성된 댓글이 없습니다.<br/>방장에게 궁금한 점이나 인사말을 남겨보세요!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold shrink-0">
                {(comment.user.nickname || comment.user.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-800 text-sm">
                    {comment.user.nickname || comment.user.email.split('@')[0]}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(comment.createdAt).toLocaleString("ko-KR", { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 댓글 작성 폼 */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={currentUserId ? "궁금한 점이나 인사말을 남겨보세요!" : "로그인 후 댓글을 작성할 수 있습니다."}
          disabled={!currentUserId || isLoading}
          className="flex-1 h-12 bg-slate-50"
        />
        <Button 
          type="submit" 
          disabled={!currentUserId || isLoading || !newComment.trim()}
          className="bg-green-600 hover:bg-green-700 h-12 px-6"
        >
          {isLoading ? "등록 중..." : "등록"}
        </Button>
      </form>
    </div>
  );
}