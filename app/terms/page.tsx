import Link from 'next/link'

export const metadata = {
  title: '利用規約 | スポミル',
  description: 'スポミル（spomeal）の利用規約',
}

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif" }}>
      {/* ヘッダー */}
      <div style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', padding: '48px 24px 40px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginBottom: '8px', letterSpacing: '0.1em' }}>SPOMEAL</p>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'white', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            利用規約
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>最終更新日：2026年4月15日</p>
        </div>
      </div>

      {/* 本文 */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>

        <Section num="1" title="本規約について">
          <p>
            本利用規約（以下「本規約」といいます）は、株式会社トレイズ（以下「当社」といいます）が提供するスポーツ×食事管理アプリ「スポミル（spomeal）」（以下「本サービス」といいます）の利用条件を定めるものです。登録ユーザーの皆さま（以下「ユーザー」といいます）には、本規約に同意いただいた上で本サービスをご利用いただきます。
          </p>
        </Section>

        <Section num="2" title="利用登録">
          <Ol>
            <li>本サービスの利用登録は、本規約に同意の上、当社の定める方法により利用登録を希望する者が申請し、当社がこれを承認することによって完了するものとします。</li>
            <li>当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由について一切の開示義務を負わないものとします。
              <Ul>
                <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
                <li>本規約に違反したことがある者からの申請である場合</li>
                <li>その他、当社が利用登録を相当でないと判断した場合</li>
              </Ul>
            </li>
          </Ol>
        </Section>

        <Section num="3" title="ユーザーIDおよびパスワードの管理">
          <Ol>
            <li>ユーザーは、自己の責任においてユーザーIDおよびパスワードを適切に管理するものとします。</li>
            <li>ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。</li>
            <li>ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には、そのユーザーIDを登録しているユーザー自身による利用とみなします。</li>
          </Ol>
        </Section>

        <Section num="4" title="利用料金および支払方法">
          <Ol>
            <li>ユーザーは、本サービスの有料部分の対価として、当社が別途定め、本サービスに表示する利用料金を、当社が指定する方法により支払うものとします。</li>
            <li>全プランに14日間の無料トライアル期間が付属します。無料トライアル終了後は、登録時に選択されたプランで自動的に課金が開始されます。</li>
            <li>ユーザーが利用料金の支払を遅滞した場合、ユーザーは年14.6％の割合による遅延損害金を支払うものとします。</li>
            <li>プランの詳細および料金は
              <Link href="/plans" style={{ color: '#16a34a', textDecoration: 'underline', textUnderlineOffset: '2px', margin: '0 4px' }}>料金プランページ</Link>
              および
              <Link href="/tokushoho" style={{ color: '#16a34a', textDecoration: 'underline', textUnderlineOffset: '2px', margin: '0 4px' }}>特定商取引法に基づく表記</Link>
              をご確認ください。
            </li>
          </Ol>
        </Section>

        <Section num="5" title="禁止事項">
          <p style={{ marginBottom: '16px' }}>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
          <Ol>
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>当社、本サービスの他のユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
            <li>当社のサービスの運営を妨害するおそれのある行為</li>
            <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
            <li>不正アクセスをし、またはこれを試みる行為</li>
            <li>他のユーザーに成りすます行為</li>
            <li>当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
            <li>当社、本サービスの他のユーザーまたは第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為</li>
            <li>以下の表現を含み、または含むと当社が判断する内容を本サービス上に投稿または送信する行為
              <Ul>
                <li>過度に暴力的な表現</li>
                <li>露骨な性的表現</li>
                <li>人種、国籍、信条、性別、社会的身分、門地等による差別につながる表現</li>
                <li>自殺、自傷行為、薬物乱用を誘引または助長する表現</li>
                <li>その他反社会的な内容を含み他人に不快感を与える表現</li>
              </Ul>
            </li>
            <li>以下を目的とし、または目的とすると当社が判断する行為
              <Ul>
                <li>営業、宣伝、広告、勧誘、その他営利を目的とする行為（当社の認めたものを除く）</li>
                <li>面識のない異性との出会いや交際を目的とする行為</li>
                <li>他のユーザーに対する嫌がらせや誹謗中傷を目的とする行為</li>
                <li>当社、本サービスの他のユーザー、または第三者に不利益、損害または不快感を与えることを目的とする行為</li>
              </Ul>
            </li>
            <li>その他、当社が不適切と判断する行為</li>
          </Ol>
        </Section>

        <Section num="6" title="本サービスの提供の停止等">
          <Ol>
            <li>当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
              <Ul>
                <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                <li>その他、当社が本サービスの提供が困難と判断した場合</li>
              </Ul>
            </li>
            <li>当社は、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。</li>
          </Ol>
        </Section>

        <Section num="7" title="著作権">
          <p>
            ユーザーは、自ら著作権等の必要な知的財産権を有するか、または必要な権利者の許諾を得た文章、画像、写真、動画その他のデータ（以下「データ等」といいます）のみ、本サービスを利用し投稿または編集することができるものとします。
          </p>
        </Section>

        <Section num="8" title="利用制限および登録抹消">
          <Ol>
            <li>当社は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
              <Ul>
                <li>本規約のいずれかの条項に違反した場合</li>
                <li>登録事項に虚偽の事実があることが判明した場合</li>
                <li>料金等の支払債務の不履行があった場合</li>
                <li>当社からの連絡に対し、一定期間返答がない場合</li>
                <li>本サービスについて、最終の利用から一定期間利用がない場合</li>
                <li>その他、当社が本サービスの利用を適当でないと判断した場合</li>
              </Ul>
            </li>
          </Ol>
        </Section>

        <Section num="9" title="退会">
          <p>
            ユーザーは、当社の定める退会手続により、本サービスから退会できるものとします。退会後はこれまでの記録データ（食事記録・体組成・予約・ポイント等）にアクセスできなくなり、一定期間経過後に削除されます。
          </p>
        </Section>

        <Section num="10" title="保証の否認および免責事項">
          <Ol>
            <li>当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。</li>
            <li>本サービスは、医療行為や診断・処方を行うものではありません。栄養・体組成・トレーニングに関する情報は参考情報であり、健康上の重要な判断は必ず医師・管理栄養士等の専門家にご相談ください。</li>
            <li>当社は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。</li>
          </Ol>
        </Section>

        <Section num="11" title="サービス内容の変更等">
          <p>
            当社は、ユーザーへの事前の告知をもって、本サービスの内容を変更、追加または廃止することがあり、ユーザーはこれを承諾するものとします。
          </p>
        </Section>

        <Section num="12" title="利用規約の変更">
          <p>
            当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお、本規約の変更後、本サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
          </p>
        </Section>

        <Section num="13" title="個人情報の取扱い">
          <p>
            当社は、本サービスの利用によって取得する個人情報については、当社の
            <Link href="/privacy" style={{ color: '#16a34a', textDecoration: 'underline', textUnderlineOffset: '2px', margin: '0 4px' }}>プライバシーポリシー</Link>
            に従い適切に取り扱うものとします。
          </p>
        </Section>

        <Section num="14" title="通知または連絡">
          <p>
            ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。当社は、ユーザーから当社が別途定める方式に従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは発信時にユーザーへ到達したものとみなします。
          </p>
        </Section>

        <Section num="15" title="権利義務の譲渡の禁止">
          <p>
            ユーザーは、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
          </p>
        </Section>

        <Section num="16" title="準拠法・裁判管轄">
          <Ol>
            <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
            <li>本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。</li>
          </Ol>
        </Section>

        {/* 会社情報 */}
        <div style={{
          marginTop: '48px', padding: '24px 28px',
          background: 'white', borderRadius: '16px',
          border: '1px solid #e5e7eb',
          textAlign: 'right',
        }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>株式会社トレイズ</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>〒650-0011 兵庫県神戸市中央区下山手通2-4-10 5階</p>
        </div>

        {/* フッターリンク */}
        <div style={{ marginTop: '40px', textAlign: 'center', display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ fontSize: '13px', color: '#16a34a', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            プライバシーポリシー
          </Link>
          <Link href="/plans" style={{ fontSize: '13px', color: '#16a34a', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            料金プラン
          </Link>
          <Link href="/" style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            ← トップに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '28px 32px',
      marginBottom: '16px',
      border: '1px solid #f0f0f0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          color: 'white', fontSize: '12px', fontWeight: 800, flexShrink: 0,
        }}>{num}</span>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>
          第{num}条（{title}）
        </h2>
      </div>
      <div style={{ fontSize: '14px', color: '#374151', lineHeight: 2.0 }}>
        {children}
      </div>
    </div>
  )
}

function Ol({ children }: { children: React.ReactNode }) {
  return (
    <ol style={{ margin: 0, paddingLeft: '20px', listStyleType: 'decimal' }}>
      {children}
    </ol>
  )
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul style={{ margin: '10px 0 4px 8px', paddingLeft: '16px', listStyleType: 'disc' }}>
      {children}
    </ul>
  )
}
