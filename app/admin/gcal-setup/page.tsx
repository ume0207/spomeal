'use client'

import { useEffect, useState } from 'react'

const GCAL_TOKEN_KEY = 'gcal_refresh_token'
const CLIENT_ID_KEY = 'gcal_client_id'

export default function GcalSetupPage() {
  const [step, setStep] = useState<'input' | 'waiting' | 'done' | 'error'>('input')
  const [clientId, setClientId] = useState('')
  const [message, setMessage] = useState('')
  const [savedToken, setSavedToken] = useState<string | null>(null)

  useEffect(() => {
    // すでに保存済みのクライアントIDを読み込む
    const saved = localStorage.getItem(CLIENT_ID_KEY)
    if (saved) setClientId(saved)

    const token = localStorage.getItem(GCAL_TOKEN_KEY)
    if (token) setSavedToken(token)

    // OAuth コールバック処理（URLに ?code= がある場合）
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      setStep('error')
      setMessage(`Google認証がキャンセルされました: ${error}`)
      return
    }

    if (code) {
      setStep('waiting')
      setMessage('トークンを取得中...')
      const storedClientId = localStorage.getItem(CLIENT_ID_KEY) || ''
      const redirectUri = `${window.location.origin}/admin/gcal-setup/`

      fetch('/api/gcal/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri }),
      })
        .then(r => r.json())
        .then((data: { refresh_token?: string; error?: string }) => {
          if (data.refresh_token) {
            localStorage.setItem(GCAL_TOKEN_KEY, data.refresh_token)
            setSavedToken(data.refresh_token)
            setStep('done')
            setMessage('Google カレンダーと連携しました！')
            // URLのクエリパラメータを消す
            window.history.replaceState({}, '', '/admin/gcal-setup/')
          } else {
            setStep('error')
            setMessage(`エラー: ${data.error || '不明なエラー'}`)
          }
        })
        .catch(err => {
          setStep('error')
          setMessage(`通信エラー: ${err}`)
        })
      return
    }
  }, [])

  const startOAuth = () => {
    if (!clientId.trim()) {
      alert('Google Client ID を入力してください')
      return
    }
    localStorage.setItem(CLIENT_ID_KEY, clientId.trim())
    const redirectUri = `${window.location.origin}/admin/gcal-setup/`
    const params = new URLSearchParams({
      client_id: clientId.trim(),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  const clearToken = () => {
    localStorage.removeItem(GCAL_TOKEN_KEY)
    setSavedToken(null)
    setStep('input')
    setMessage('')
  }

  const s: React.CSSProperties = {
    fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
    minHeight: '100vh', background: '#f3f4f6', padding: '24px 16px',
  }

  return (
    <div style={s}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
          📅 Google カレンダー連携設定
        </h1>
        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '24px' }}>
          spomeal20260323@gmail.com のカレンダーと連携します
        </p>

        {/* 連携済みバナー */}
        {savedToken && (
          <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#16a34a', marginBottom: '4px' }}>✅ 連携済み</div>
            <div style={{ fontSize: '12px', color: '#374151', marginBottom: '12px' }}>Google カレンダーと正常に連携されています。予約時に自動でMeetリンクが発行されます。</div>

            {/* スマホでも使えるようにするためのCloudflare設定手順 */}
            <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px', marginBottom: '12px', fontSize: '12px', color: '#92400e', lineHeight: 1.8 }}>
              <strong>📱 スマホでも Meet リンクを使うには：</strong><br />
              1. 下の「トークンをコピー」ボタンを押す<br />
              2. <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" style={{ color: '#d97706' }}>Cloudflare Pages</a> → 設定 → 環境変数<br />
              3. 変数名 <code style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: '3px' }}>GOOGLE_REFRESH_TOKEN</code> で貼り付けて保存<br />
              4. 再デプロイ
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(savedToken)
                alert('トークンをコピーしました！\nCloudflare の環境変数 GOOGLE_REFRESH_TOKEN に貼り付けてください。')
              }}
              style={{ display: 'block', width: '100%', padding: '10px', borderRadius: '10px', border: 'none', background: '#16a34a', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '8px' }}
            >
              📋 トークンをコピー（Cloudflare 設定用）
            </button>

            <button onClick={clearToken} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: '1px solid #fca5a5', borderRadius: '8px', padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              連携を解除する
            </button>
          </div>
        )}

        {step === 'waiting' && (
          <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1d4ed8' }}>{message}</div>
          </div>
        )}

        {(step === 'error') && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>❌ エラー</div>
            <div style={{ fontSize: '12px', color: '#374151' }}>{message}</div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#16a34a' }}>🎉 {message}</div>
          </div>
        )}

        {/* 設定フォーム */}
        {!savedToken && step !== 'waiting' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '16px' }}>Google Client ID を入力</h2>

            <div style={{ background: '#f0f9ff', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: '#0369a1', lineHeight: 1.7 }}>
              <strong>事前準備：</strong><br />
              1. <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: '#0ea5e9' }}>console.cloud.google.com</a> を開く<br />
              2. APIとサービス → 認証情報<br />
              3. OAuth 2.0 クライアント ID の編集を開く<br />
              4. 「承認済みのリダイレクトURI」に以下を追加：<br />
              <code style={{ background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/admin/gcal-setup/` : 'https://spomeal.jp/admin/gcal-setup/'}
              </code>
            </div>

            <label style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
              Google Client ID
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxxx.apps.googleusercontent.com"
              style={{
                width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '10px',
                padding: '10px 12px', fontSize: '13px', outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '16px',
              }}
            />

            <button
              onClick={startOAuth}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                background: '#0ea5e9', color: 'white', fontWeight: 800, fontSize: '15px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              🔗 Google カレンダーと連携する
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
