import { EmbedBuilder, type VoiceState } from "discord.js";
import { sendLog, LogColors } from "./log.js";

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;

  const avatar = member.user.displayAvatarURL({ size: 128 });
  const user = `<@${member.id}> — ${member.user.tag}`;

  const oldChannel = oldState.channelId;
  const newChannel = newState.channelId;

  let title: string;
  let description: string;
  let color: number;

  if (!oldChannel && newChannel) {
    // Rejoint un vocal
    title = "Vocal — Connexion";
    description = `${user}\n\n**Rejoint :** <#${newChannel}>`;
    color = LogColors.join;
  } else if (oldChannel && !newChannel) {
    // Quitte un vocal
    title = "Vocal — Déconnexion";
    description = `${user}\n\n**Quitté :** <#${oldChannel}>`;
    color = LogColors.leave;
  } else if (oldChannel && newChannel && oldChannel !== newChannel) {
    // Changement de salon
    title = "Vocal — Déplacement";
    description = `${user}\n\n<#${oldChannel}> → <#${newChannel}>`;
    color = LogColors.update;
  } else {
    // Mute/unmute/deaf etc. — on ignore pour éviter le spam
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: title, iconURL: avatar })
    .setDescription(description)
    .setFooter({ text: `ID: ${member.id}` })
    .setTimestamp();

  await sendLog(embed);
}
