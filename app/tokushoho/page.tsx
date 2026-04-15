export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 border-b pb-4">
          特定商取引法に基づく表記
        </h1>

        <table className="w-full border-collapse text-sm">
          <tbody>
            <Row label="販売業者" value="株式会社トレイズ" />
            <Row label="代表責任者" value="梅原 雅之" />
            <Row
              label="所在地"
              value="〒650-0011 兵庫県神戸市中央区下山手通2-4-10 5階"
            />
            <Row label="電話番号" value="090-2599-3794" />
            <Row
              label="お問い合わせ"
              value="spomeal20260323@gmail.com"
            />
            <Row
              label="サービス名"
              value="スポミル（spomeal）"
            />
            <Row
              label="販売価格"
              value={
                <>
                  <p className="mb-2">各プランの月額料金（税込）は以下のとおりです。</p>
                  <table className="border-collapse text-xs w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left">プラン</th>
                        <th className="border border-gray-300 px-3 py-2 text-right">単月</th>
                        <th className="border border-gray-300 px-3 py-2 text-right">3ヶ月（5%OFF）</th>
                        <th className="border border-gray-300 px-3 py-2 text-right">半年（10%OFF）</th>
                        <th className="border border-gray-300 px-3 py-2 text-right">1年（20%OFF）</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2">ライト</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">¥615/月</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">¥584/月</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">¥554/月</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">¥492/月</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2">スタンダード</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">¥2,980/月</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">¥2,831/月</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">¥2,682/月</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">¥2,384/月</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2">プレミアム</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">¥9,980/月</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">¥9,481/月</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">¥8,982/月</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">¥7,984/月</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-2 text-gray-500">※ 全プラン、初回2週間の無料トライアルあり</p>
                </>
              }
            />
            <Row
              label="利用制限・機能範囲"
              value={
                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-gray-700">各プランのご利用上限は以下のとおりです。</p>
                  <table className="border-collapse w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left">プラン</th>
                        <th className="border border-gray-300 px-2 py-1 text-center">AI食事解析</th>
                        <th className="border border-gray-300 px-2 py-1 text-center">ミーティング</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">トライアル</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">1日5回</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">期間中1回</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">ライト</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">1日5回</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">なし</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">スタンダード</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">1日10回</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">月1回</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">プレミアム</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">無制限</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">月2回 + 週1回フィードバック</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              }
            />
            <Row
              label="代金の支払時期・自動更新"
              value={
                <div className="space-y-2">
                  <p className="font-semibold text-red-600">
                    ご登録時に選択されたプランは、無料トライアル終了後に自動的に課金が開始されます。
                  </p>
                  <p>・14日間の無料トライアル終了後、登録されたクレジットカードより選択プランの料金が自動決済されます。</p>
                  <p>・以降は契約期間（月額・3ヶ月・半年・年間）に応じて自動更新されます。</p>
                  <p>・無料トライアル期間中に解約手続きを行った場合、料金は一切発生しません。</p>
                  <p>・自動更新を停止したい場合は、更新日の前日までにマイページから解約手続きを行ってください。</p>
                </div>
              }
            />
            <Row
              label="支払方法"
              value="クレジットカード（Visa・Mastercard・American Express・JCB）"
            />
            <Row
              label="サービス提供時期"
              value="決済完了後（無料トライアル期間中）、直ちにサービスをご利用いただけます。"
            />
            <Row
              label="解約・返金について"
              value={
                <>
                  <p>・解約はマイページよりいつでも可能です。</p>
                  <p>・解約後は契約期間終了まで引き続きご利用いただけます。</p>
                  <p>・デジタルコンテンツの性質上、原則として返金はお受けしておりません。</p>
                  <p>・無料トライアル期間中に解約した場合、料金は発生しません。</p>
                </>
              }
            />
            <Row
              label="動作環境"
              value="インターネットに接続されたスマートフォン・タブレット・PCブラウザ（最新版推奨）"
            />
            <Row
              label="その他"
              value="本サービスはサブスクリプション型のオンラインサービスです。サービス内容・料金は予告なく変更される場合があります。"
            />
          </tbody>
        </table>

        <p className="mt-10 text-xs text-gray-400">
          最終更新日：2026年3月27日
        </p>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <tr className="border-b border-gray-200">
      <th className="py-4 pr-6 text-left align-top font-semibold text-gray-700 whitespace-nowrap w-40">
        {label}
      </th>
      <td className="py-4 text-gray-600 leading-relaxed">{value}</td>
    </tr>
  )
}
