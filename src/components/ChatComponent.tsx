'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, User, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ChatMessage = {
  id: string;
  product_id: string;
  sender_type: 'customer' | 'company';
  sender_name: string;
  message: string;
  created_at: string;
};

type ChatComponentProps = {
  productId: string;
  productName: string;
  isCompanyUser?: boolean;
  companyName?: string;
};

export default function ChatComponent({ 
  productId, 
  productName, 
  isCompanyUser = false, 
  companyName = '' 
}: ChatComponentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // メッセージ取得
  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat/${productId}`);
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages || []);
      } else {
        setError(data.error || 'メッセージの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('メッセージの取得中にエラーが発生しました');
    }
  };

  // メッセージ送信
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    setError('');

    try {
      const senderType = isCompanyUser ? 'company' : 'customer';
      const senderName = isCompanyUser ? (companyName || '会社担当者') : 'お客様';

      const response = await fetch(`/api/chat/${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_type: senderType,
          sender_name: senderName,
          message: newMessage.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewMessage('');
        // 新しいメッセージを追加
        setMessages(prev => [...prev, data.message]);
        // スクロールを最下部に移動
        setTimeout(() => {
          if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
          }
        }, 100);
      } else {
        setError(data.error || 'メッセージの送信に失敗しました');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('メッセージの送信中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // Enterキーでメッセージ送信
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 初期メッセージ取得とリアルタイム購読
  useEffect(() => {
    fetchMessages();

    // リアルタイム購読を設定
    const channel = supabase
      .channel(`chat:${productId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `product_id=eq.${productId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    // クリーンアップ
    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId]);

  // 自動スクロール
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
        <CardTitle className="flex items-center text-blue-800">
          <MessageCircle className="w-5 h-5 mr-2" />
          製品についてのやり取り
        </CardTitle>
        <p className="text-blue-600 text-sm">
          {productName}について、ご質問やご要望がございましたらお気軽にお書き込みください。
        </p>
      </CardHeader>
      <CardContent className="p-4">
        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* メッセージ一覧 */}
        <ScrollArea 
          ref={scrollAreaRef}
          className="h-96 mb-4 border rounded-md p-4"
        >
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>まだメッセージはありません</p>
              <p className="text-sm">最初のメッセージを送信してみましょう</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'company' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_type === 'company'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      {message.sender_type === 'company' ? (
                        <Building2 className="w-4 h-4 mr-2" />
                      ) : (
                        <User className="w-4 h-4 mr-2" />
                      )}
                      <span className="text-xs font-medium">
                        {message.sender_name}
                      </span>
                    </div>
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(message.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* メッセージ入力 */}
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力してください..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* ヘルプテキスト */}
        <div className="mt-3 text-xs text-gray-500 text-center">
          {isCompanyUser ? (
            <p>会社担当者としてメッセージを送信します</p>
          ) : (
            <p>お客様としてメッセージを送信します</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 
