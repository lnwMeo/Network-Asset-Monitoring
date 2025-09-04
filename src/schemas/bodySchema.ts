import { z } from "zod";
const bodySchema = () => {
 z.object({
  name: z.string().trim().min(1, "Name is required"),
});
}
export default bodySchema