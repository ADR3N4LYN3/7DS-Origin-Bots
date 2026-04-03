import { EmbedBuilder, type GuildMember, type PartialGuildMember } from "discord.js";
import { sendLog, LogColors } from "./log.js";

export async function handleGuildMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
) {
  const changes: string[] = [];

  // ── Nickname ──
  const oldNick = oldMember.nickname ?? oldMember.user?.username ?? "?";
  const newNick = newMember.nickname ?? newMember.user.username;
  if (oldMember.nickname !== newMember.nickname) {
    changes.push(`**Pseudo :** ${oldNick} → ${newNick}`);
  }

  // ── Rôles ajoutés / retirés ──
  if ("cache" in (oldMember.roles ?? {})) {
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const added = newRoles.filter((r) => !oldRoles.has(r.id) && r.id !== newMember.guild.id);
    const removed = oldRoles.filter((r) => !newRoles.has(r.id) && r.id !== newMember.guild.id);

    if (added.size > 0) {
      changes.push(`**Rôle ajouté :** ${added.map((r) => `<@&${r.id}>`).join(", ")}`);
    }
    if (removed.size > 0) {
      changes.push(`**Rôle retiré :** ${removed.map((r) => `<@&${r.id}>`).join(", ")}`);
    }
  }

  // ── Timeout (mute) ──
  const wasMuted = oldMember.communicationDisabledUntil;
  const isMuted = newMember.communicationDisabledUntil;
  if (!wasMuted && isMuted) {
    changes.push(`**Mute :** jusqu'à <t:${Math.floor(isMuted.getTime() / 1000)}:R>`);
  } else if (wasMuted && !isMuted) {
    changes.push("**Unmute :** restriction levée");
  }

  // ── Avatar serveur ──
  if (oldMember.avatar !== newMember.avatar) {
    changes.push("**Avatar serveur** modifié");
  }

  if (changes.length === 0) return;

  const avatar = newMember.user.displayAvatarURL({ size: 128 });

  const embed = new EmbedBuilder()
    .setColor(LogColors.update)
    .setAuthor({ name: "Membre modifié", iconURL: avatar })
    .setThumbnail(avatar)
    .setDescription(`<@${newMember.id}> — **${newMember.user.tag}**\n\n${changes.join("\n")}`)
    .setFooter({ text: `ID: ${newMember.id}` })
    .setTimestamp();

  await sendLog(embed);
}
