import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";

const tenantId = process.env.ENTRA_TENANT_ID!;
const clientId = process.env.ENTRA_CLIENT_ID!;

const jwksClient = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  jwksClient.getSigningKey(header.kid!, (err, key) => {
    if (err) return callback(err);
    callback(null, key!.getPublicKey());
  });
}

export function validateEntraToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice(7);
  jwt.verify(
    token,
    getKey,
    {
      audience: [clientId, `api://${clientId}`],
      issuer: [
        `https://login.microsoftonline.com/${tenantId}/v2.0`,
        `https://sts.windows.net/${tenantId}/`,
      ],
      algorithms: ["RS256"],
    },
    (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Invalid token", detail: err.message });
      }
      (req as any).user = decoded;
      next();
    }
  );
}
