/**
 * ثبت شخص جدید — نام و شماره تماس اختیاری.
 */
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Screen, FormField, TextField, PrimaryButton } from "@/components";
import { getAppDb } from "@/db/client";
import { createPerson } from "@/lib/repo";
import { personFormSchema, zodMessages } from "@/lib/validation";

export default function PersonNewScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = () => {
    const z = personFormSchema.safeParse({ name: name.trim(), phone: phone.trim() });
    if (!z.success) {
      setErrors(zodMessages(z.error));
      return;
    }
    const id = createPerson(getAppDb().db, z.data as never);
    router.replace(`/persons/${id}` as never);
  };

  return (
    <Screen title="شخص جدید" onBack={() => router.back()}>
      <FormField label="نام" required error={errors.name}>
        <TextField value={name} onChangeText={setName} placeholder="مثلاً علی محمدی" autoFocus />
      </FormField>
      <FormField label="شماره تماس (اختیاری)" error={errors.phone}>
        <TextField value={phone} onChangeText={setPhone} placeholder="09xxxxxxxxx" keyboardType="phone-pad" />
      </FormField>
      <PrimaryButton label="ثبت شخص" onPress={save} />
    </Screen>
  );
}
