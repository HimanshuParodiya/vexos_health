// Maps an API error onto react-hook-form. Supports a backend response shaped
// like { message, errors: { fieldName: "message" } }. Returns the general message.
export function applyServerErrors(error, setError) {
  const fieldErrors = error?.data?.errors;
  if (fieldErrors && typeof fieldErrors === "object") {
    for (const [field, message] of Object.entries(fieldErrors)) {
      setError(field, { type: "server", message: String(message) });
    }
  }
  return error?.message ?? "Something went wrong. Please try again.";
}
