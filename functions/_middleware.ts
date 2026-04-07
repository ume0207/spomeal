// iOS 26.4 beta対応: HTTP/3 (QUIC) へのアップグレードを無効化
// alt-svcヘッダーを除去してHTTP/2接続を維持する
export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  const newHeaders = new Headers(response.headers);
  newHeaders.delete('alt-svc');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
