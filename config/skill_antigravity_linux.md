---
name: linux-ai-vm
description: Liga e controla a VM Linux Diario para tarefas gráficas no Linux, automações visuais e navegação isolada.
---

# Skill: Controle Autônomo da VM Linux no Antigravity

Use esta skill para tarefas que exigem um ambiente gráfico seguro e isolado, testes de ferramentas, navegação sem sujar o PC host ou automações visuais com verificação por tela.

## Fluxo de Trabalho do Agente

1. **Verificação de Estado:**
   * Execute `linux_status` para checar se a VM está ligada. Se estiver desligada, chame `linux_prepare_if_off`.

2. **Interação Híbrida (Visual + Comandos):**
   * **Visual (VNC):** Utilize `vnc_click`, `vnc_type_text`, `vnc_key_press` para interagir como um humano.
   * **Shell Rápido (SSH):** Utilize `linux_command` para executar ferramentas na VM com `DISPLAY=:0` (ex: `wmctrl`, `xdotool`, `curl`, `git`).

3. **Verificação Visual Obrigatória:**
   * Sempre chame `linux_observe` após ações gráficas para inspecionar o screenshot real antes de confirmar a conclusão da tarefa para o usuário.

4. **Transparência para o Usuário:**
   * O usuário pode assistir à sessão ao vivo no navegador pelo endereço:
     `http://127.0.0.1:5994/vnc.html?autoconnect=1&resize=scale&path=websockify`
   * Caso o visualizador não esteja aberto, chame `linux_viewer_open`.
