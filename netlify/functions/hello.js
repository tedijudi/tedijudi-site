// netlify/functions/hello.js
exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: "안녕, Netlify 함수 잘 작동 중! 👋",
  };
};
