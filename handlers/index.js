// Lambdaのエントリーポイント

"use strict";

exports.handler = async (event) => {
  console.log("event:", event);
  // まだロジック未実装でも、必ず200を返して検証を通す
  return { statusCode: 200, body: "OK" };
};
