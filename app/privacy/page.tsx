import Link from 'next/link'

export const metadata = {
  title: 'プライバシーポリシー | スポミル',
  description: 'スポミル（spomeal）のプライバシーポリシー',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 border-b pb-4">
          プライバシーポリシー
        </h1>
        <p className="text-xs text-gray-500 mb-8">最終更新日：2026年4月15日</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
          <Section title="はじめに">
            <p>
              株式会社トレイズ（以下「当社」）は、当社が運営するスポーツ×食事管理アプリ「スポミル（spomeal）」（以下「本サービス」）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。本ポリシーは個人情報の保護に関する法律（個人情報保護法）、その他関連法令・ガイドラインを遵守いたします。
            </p>
          </Section>

          <Section title="第1条（取得する個人情報）">
            <p className="mb-2">本サービスでは、以下の情報を取得します。</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong>アカウント登録時に取得する情報</strong>
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>メールアドレス</li>
                  <li>氏名（フルネーム・ふりがな）</li>
                  <li>パスワード（暗号化して保存）</li>
                  <li>電話番号（任意）</li>
                  <li>住所（任意）</li>
                  <li>性別・年齢（任意）</li>
                </ul>
              </li>
              <li>
                <strong>本サービスの利用に伴い取得する情報</strong>
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>食事記録（写真・料理名・栄養成分）</li>
                  <li>体組成データ（体重・体脂肪率・筋肉量等）</li>
                  <li>目標設定データ（カロリー・PFC等）</li>
                  <li>予約履歴・管理栄養士とのミーティング内容</li>
                  <li>ポイント履歴・抽選履歴</li>
                </ul>
              </li>
              <li>
                <strong>決済に関連する情報</strong>（Stripe社経由）
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>支払いステータス（アクティブ・解約済み等）</li>
                  <li>サブスクリプションID</li>
                  <li><strong>※クレジットカード番号等の決済情報は、当社が直接取得・保管することはありません。</strong>Stripe社が運営するPCI DSS準拠の決済システムにて管理されます。</li>
                </ul>
              </li>
              <li>
                <strong>Cookieおよびログ情報</strong>
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>ログイン状態の保持に使用</li>
                  <li>IPアドレス・ブラウザ情報・アクセス時刻</li>
                  <li>セキュリティ強化（不正アクセス検知）のための情報</li>
                </ul>
              </li>
            </ol>
          </Section>

          <Section title="第2条（個人情報の利用目的）">
            <p className="mb-2">取得した個人情報は、以下の目的で利用します。</p>
            <ol className="list-decimal list-inside space-y-2">
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
            </ol>
          </Section>

          <Section title="第3条（第三者提供）">
            <p className="mb-2">当社は、以下の場合を除き、個人情報を第三者に提供しません。</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
              <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
            </ol>
          </Section>

          <Section title="第4条（個人情報の委託）">
            <p className="mb-2">
              当社は、利用目的の達成に必要な範囲内において、個人情報の取扱いの全部または一部を以下の委託先に委託する場合があります。
            </p>
            <ul className="list-disc list-inside ml-2 space-y-2">
              <li><strong>Supabase Inc.</strong>（米国）: データベース・認証基盤の提供</li>
              <li><strong>Stripe, Inc.</strong>（米国）: クレジットカード決済処理</li>
              <li><strong>Cloudflare, Inc.</strong>（米国）: CDN・セキュリティ・ホスティング</li>
              <li><strong>Google LLC</strong>（米国）: Google Calendar・Google Meet連携</li>
              <li><strong>OpenAI, Inc.</strong>（米国）: AI食事解析・アドバイス生成</li>
              <li><strong>Resend, Inc.</strong>（米国）: メール配信</li>
            </ul>
            <p className="mt-2 text-xs text-gray-500">
              ※これらの委託先はいずれも適切なセキュリティ対策（GDPR、CCPA等のプライバシー法令遵守、ISO27001等の認証取得）を実施しています。
            </p>
          </Section>

          <Section title="第5条（個人情報の開示・訂正・削除等）">
            <ol className="list-decimal list-inside space-y-2">
              <li>ユーザーは、当社に対して、個人情報の開示、訂正、追加、削除、利用停止、消去、第三者提供の停止を請求することができます。</li>
              <li>アプリ内のマイページおよび設定画面から、登録情報の確認・編集・退会手続きを行うことができます。</li>
              <li>上記以外のご請求は、下記お問い合わせ先までご連絡ください。</li>
            </ol>
          </Section>

          <Section title="第6条（個人情報の保管期間）">
            <ol className="list-decimal list-inside space-y-2">
              <li>当社は、個人情報を利用目的の達成に必要な期間に限り保管します。</li>
              <li>退会手続き後、アカウント情報および記録データは一定期間経過後（最大90日以内）に削除されます。</li>
              <li>法令等により保管が義務付けられている情報については、当該法令に定める期間保管します。</li>
            </ol>
          </Section>

          <Section title="第7条（安全管理措置）">
            <p className="mb-2">当社は、個人情報の漏えい、滅失、毀損の防止その他個人情報の安全管理のため、以下の措置を講じています。</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>通信の暗号化（HTTPS/TLS 1.3）</li>
              <li>パスワードのハッシュ化保存</li>
              <li>APIエンドポイントの認証・認可（JWT認証）</li>
              <li>HTTPセキュリティヘッダーの設定（CSP・HSTS・X-Frame-Options等）</li>
              <li>不正アクセス検知・アラート</li>
              <li>定期的な脆弱性スキャン</li>
              <li>アクセス権限の最小化</li>
              <li>個人情報取扱い従業員の教育</li>
            </ul>
          </Section>

          <Section title="第8条（Cookieの使用について）">
            <ol className="list-decimal list-inside space-y-2">
              <li>当社は、ユーザー体験の向上およびセキュリティ維持のためにCookieを使用します。</li>
              <li>Cookieには以下の用途があります：
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>ログインセッションの維持</li>
                  <li>CSRF対策</li>
                  <li>ユーザー設定の記憶</li>
                </ul>
              </li>
              <li>ユーザーはブラウザ設定によりCookieを無効にできますが、一部機能が正常に動作しない場合があります。</li>
            </ol>
          </Section>

          <Section title="第9条（プライバシーポリシーの変更）">
            <ol className="list-decimal list-inside space-y-2">
              <li>本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく変更することができるものとします。</li>
              <li>当社が別途定める場合を除いて、変更後のプライバシーポリシーは、本サービス上に掲載したときから効力を生じるものとします。</li>
            </ol>
          </Section>

          <Section title="第10条（お問い合わせ窓口）">
            <p>本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。</p>
            <div className="mt-3 pl-4 border-l-2 border-gray-200">
              <p>株式会社トレイズ</p>
              <p>〒650-0011 兵庫県神戸市中央区下山手通2-4-10 5階</p>
              <p>メールアドレス：spomeal20260323@gmail.com</p>
            </div>
          </Section>
        </div>

        <div className="mt-12 text-center space-x-4">
          <Link href="/terms" className="text-sm text-green-600 underline">
            利用規約
          </Link>
          <Link href="/tokushoho" className="text-sm text-green-600 underline">
            特定商取引法に基づく表記
          </Link>
          <Link href="/" className="text-sm text-green-600 underline">
            トップに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      <div className="pl-2">{children}</div>
    </section>
  )
}
