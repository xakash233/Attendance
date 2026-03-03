import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                ...globals.node,
            }
        },
        rules: {
            "no-unused-vars": ["warn", {
                "argsIgnorePattern": "^(req|res|next|tx|err|_)$",
                "varsIgnorePattern": "^(pendingUser|mailError|updatedSyncLog|settings|auditService|authorize|response|result|leaveRequest|overlapping|usersRes|deptsRes|stats|recentActivity|recentLeaves|notifications|parsedUser|isSuperAdminRoute|notifyRole)$"
            }],
            "no-console": "off",
        }
    }
];
