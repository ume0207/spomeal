import Link from 'next/link'

export const metadata = {
  title: 'プライバシーポリシー | スポミル',
  description: 'スポミル（spomeal）のプライバシーポリシー',
}

const base: React.CSSProperties = {
  fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
}

export default function PrivacyPage() {
  return (
    <div style={{ ...base, minHeight: '100vh', background: '#ffffff', color: '#1a1a1a' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '64px 32px 96px' }}>

        {/* タイトルブロック */}
        <div style={{ borderBottom: '2px solid #1a1a1a', paddingBottom: '24px', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#888', marginBottom: '14px', textTransform: 'uppercase' }}>
            Spomeal
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            プライバシーポリシー
          </h1>
        </div>
        <p style={{ fontSize: '12px', color: '#999', marginBottom: '56px', letterSpacing: '0.04em' }}>
          最終更新日：2026年4月15日
        </p>

        {/* はじめに */}
        <Section title="はじめに">
          <p>
            株式会社トレイズ（以下「当社」）は、当社が運営するスポーツ×食事管理アプリ「スポミル（spomeal）」（以下「本サービス」）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。本ポリシーは個人情報の保護に関する法律（個人情報保護法）、その他関連法令・ガイドラインを遵守いたします。
          </p>
        </Section>

        <Section title="第1条　取得する個人情報">
          <p>本サービスでは、以下の情報を取得します。</p>
          <OlSection>
            <li>
              <strong>アカウント登録時に取得する情報</strong>
              <UlSub>
                <li>メールアドレス</li>
                <li>氏名（フルネーム・ふりがな）</li>
                <li>パスワード（暗号化して保存）</li>
                <li>電話番号（任意）</li>
                <li>住所（任意）</li>
                <li>性別・年齢（任意）</li>
              </UlSub>
            </li>
            <li>
              <strong>本サービスの利用に伴い取得する情報</strong>
              <UlSub>
                <li>食事記録（写真・料理名・栄養成分）</li>
                <li>体組成データ（体重・体脂肪率・筋肉量等）</li>
                <li>目標設定データ（カロリー・PFC等）</li>
                <li>予約履歴・管理栄養士とのミーティング内容</li>
                <li>ポイント履歴・抽選履歴</li>
              </UlSub>
            </li>
            <li>
              <strong>決済に関連する情報</strong>（Stripe社経由）
              <UlSub>
                <li>支払いステータス（アクティブ・解約済み等）</li>
                <li>サブスクリプションID</li>
                <li>※クレジットカード番号等の決済情報は、当社が直接取得・保管することはありません。Stripe社が運営するPCI DSS準拠の決済システムにて管理されます。</li>
              </UlSub>
            </li>
            <li>
              <strong>Cookieおよびログ情報</strong>
              <UlSub>
                <li>ログイン状態の保持に使用</li>
                <li>IPアドレス・ブラウザ情報・アクセス時刻</li>
                <li>セキュリティ強化（不正アクセス検知）のための情報</li>
              </UlSub>
            </li>
          </OlSection>
        </Section>

        <Section title="第2条　個人情報の利用目的">
          <p>取得した個人情報は、以下の目的で利用します。</p>
          <OlSection>
            <li>本サービスの提供・運営のため</li>
            <li>ユーザーの本人確認およびアカウント管理のため</li>
            <li>管理栄養士による食事アドバイス・指導のため</li>
            <li>AIによる食事解析・栄養計算機能の提供のため</li>
            <li>ミーティング予約およびGoogle Meetリンクの発行のため</li>
            <li>利用料金の請求および決済処理のため（Stripe社経由）</li>
            <li>ユーザーからのお問い合わせへの対応のため</li>
            <li>サービス改善および新機能開発のため（個人を特定できない形で統計的に利用）</li>
            <li>利用規約違反の調査・対応のため</li>
            <li>重要なお知らせの配信のため</li>
          </OlSection>
        </Section>

        <Section title="第3条　第三者提供">
          <p>当社は、以下の場合を除き、個人情報を第三者に提供しません。</p>
          <OlSection>
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>人の生命、身体または財産の保護のために必要がある場合</li>
            <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
            <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
          </OlSection>
        </Section>

        <Section title="第4条　個人情報の委託">
          <p>
            当社は、利用目的の達成に必要な範囲内において、個人情報の取扱いの全部または一部を以下の委託先に委託する場合があります。
          </p>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            marginTop: '20px', fontSize: '13px',
          }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #1a1a1a' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px 10px 0', fontWeight: 700, width: '40%' }}>委託先</th>
                <th style={{ textAlign: 'left', padding: '8px 0 10px', fontWeight: 700 }}>用途</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Supabase Inc.（米国）', use: 'データベース・認証基盤の提供' },
                { name: 'Stripe, Inc.（米国）', use: 'クレジットカード決済処理' },
                { name: 'Cloudflare, Inc.（米国）', use: 'CDN・セキュリティ・ホスティング' },
                { name: 'Google LLC（米国）', use: 'Google Calendar・Google Meet連携' },
                { name: 'OpenAI, Inc.（米国）', use: 'AI食事解析・アドバイス生成' },
                { name: 'Resend, Inc.（米国）', use: 'メール配信' },
              ].map((row, i, arr) => (
                <tr key={row.name} style={{ borderBottom: i < arr.length - 1 ? '1px solid #e5e5e5' : 'none' }}>
                  <td style={{ padding: '12px 12px 12px 0', color: '#1a1a1a', fontWeight: 600, verticalAlign: 'top' }}>{row.name}</td>
                  <td style={{ padding: '12px 0', color: '#444', verticalAlign: 'top' }}>{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '14px', lineHeight: 1.7 }}>
            ※これらの委託先はいずれも適切なセキュリティ対策（GDPR、CCPA等のプライバシー法令遵守、ISO27001等の認証取得）を実施しています。
          </p>
        </Section>

        <Section title="第5条　個人情報の開示・訂正・削除等">
          <OlSection>
            <li>ユーザーは、当社に対して、個人情報の開示、訂正、追加、削除、利用停止、消去、第三者提供の停止を請求することができます。</li>
            <li>アプリ内のマイページおよび設定画面から、登録情報の確認・編集・退会手続きを行うことができます。</li>
            <li>上記以外のご請求は、下記お問い合わせ先までご連絡ください。</li>
          </OlSection>
        </Section>

        <Section title="第6条　個人情報の保管期間">
          <OlSection>
            <li>当社は、個人情報を利用目的の達成に必要な期間に限り保管します。</li>
            <li>退会手続き後、アカウント情報および記録データは一定期間経過後（最大90日以内）に削除されます。</li>
            <li>法令等により保管が義務付けられている情報については、当該法令に定める期間保管します。</li>
          </OlSection>
        </Section>

        <Section title="第7条　安全管理措置">
          <p>当社は、個人情報の漏えい、滅失、毀損の防止その他個人情報の安全管理のため、以下の措置を講じています。</p>
          <UlMain>
            <li>通信の暗号化（HTTPS / TLS 1.3）</li>
            <li>パスワードのハッシュ化保存</li>
            <li>APIエンドポイントの認証・認可（JWT認証）</li>
            <li>HTTPセキュリティヘッダーの設定（CSP・HSTS・X-Frame-Options等）</li>
            <li>不正アクセス検知・アラート</li>
            <li>定期的な脆弱性スキャン</li>
            <li>アクセス権限の最小化</li>
            <li>個人情報取扱い従業員の教育</li>
          </UlMain>
        </Section>

        <Section title="第8条　Cookieの使用について">
          <OlSection>
            <li>当社は、ユーザー体験の向上およびセキュリティ維持のためにCookieを使用します。</li>
            <li>Cookieには以下の用途があります。
              <UlSub>
                <li>ログインセッションの維持</li>
                <li>CSRF対策</li>
                <li>ユーザー設定の記憶</li>
              </UlSub>
            </li>
            <li>ユーザーはブラウザ設定によりCookieを無効にできますが、一部機能が正常に動作しない場合があります。</li>
          </OlSection>
        </Section>

        <Section title="第9条　プライバシーポリシーの変更">
          <OlSection>
            <li>本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく変更することができるものとします。</li>
            <li>当社が別途定める場合を除いて、変更後のプライバシーポリシーは、本サービス上に掲載したときから効力を生じるものとします。</li>
          </OlSection>
        </Section>

        <Section title="第10条　お問い合わせ窓口" last>
          <p>本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。</p>
          <div style={{
            marginTop: '20px',
            padding: '20px 24px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            lineHeight: 2.0,
            fontSize: '14px',
          }}>
            <p style={{ margin: 0 }}>株式会社トレイズ</p>
            <p style={{ margin: 0, color: '#555' }}>〒650-0011 兵庫県神戸市中央区下山手通2-4-10 5階</p>
            <p style={{ margin: 0, color: '#555' }}>メールアドレス：spomeal20260323@gmail.com</p>
          </div>
        </Section>

        {/* フッターリンク */}
        <div style={{
          marginTop: '56px', paddingTop: '28px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex', gap: '32px', flexWrap: 'wrap',
        }}>
          <Link href="/terms" style={{ fontSize: '13px', color: '#444', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            利用規約
          </Link>
          <Link href="/tokushoho" style={{ fontSize: '13px', color: '#444', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            特定商取引法に基づく表記
          </Link>
          <Link href="/" style={{ fontSize: '13px', color: '#888', textDecoration: 'underline', textUnderlineOffset: '3px', marginLeft: 'auto' }}>
            ← トップに戻る
          </Link>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section style={{ marginBottom: last ? 0 : '52px' }}>
      <h2 style={{
        fontSize: '15px', fontWeight: 800, color: '#1a1a1a',
        margin: '0 0 20px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e0e0e0',
        letterSpacing: '0.02em',
      }}>
        {title}
      </h2>
      <div style={{ fontSize: '14px', color: '#333', lineHeight: 1.95 }}>
        {children}
      </div>
    </section>
  )
}

function OlSection({ children }: { children: React.ReactNode }) {
  return (
    <ol style={{
      margin: '14px 0 0',
      paddingLeft: '22px',
      listStyleType: 'decimal',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {children}
    </ol>
  )
}

function UlSub({ children }: { children: React.ReactNode }) {
  return (
    <ul style={{
      margin: '10px 0 4px',
      paddingLeft: '20px',
      listStyleType: 'disc',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      color: '#555',
    }}>
      {children}
    </ul>
  )
}

function UlMain({ children }: { children: React.ReactNode }) {
  return (
    <ul style={{
      margin: '14px 0 0',
      paddingLeft: '20px',
      listStyleType: 'disc',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      {children}
    </ul>
  )
}
