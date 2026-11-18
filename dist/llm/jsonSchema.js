import { z } from "zod";
/**
 * A request schema as strict JSON Schema for the Messages API's structured outputs
 * (`output_config.format`, type `json_schema`): every object closed and every field
 * required, which zod's own conversion already gives. Exported so a host that calls the
 * API over HTTP (Control Center) converts with the same zod that built the schema.
 */
export function toStrictJsonSchema(schema) {
    const out = z.toJSONSchema(schema, { target: "draft-7", io: "output" });
    delete out.$schema;
    return out;
}
//# sourceMappingURL=jsonSchema.js.map