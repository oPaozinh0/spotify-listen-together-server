import { NextPage } from "next";
import Image from 'next/image'
import config from "../../config";
import styles from '../styles/Index.module.css'
import stylesInst from '../styles/Instructions.module.css'
import spotStyles from '../styles/Spot.module.css'

const Instructions: NextPage = () => {
  const repoURL = `https://raw.githubusercontent.com/oPaozinh0/spotify-listen-together/${config.clientRecommendedVersion}`
  const listenTogetherURL = `${repoURL}/compiled/listenTogether.js`
  const windowsInstallCMD = `Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/CharlieS1103/spicetify-marketplace/master/install.ps1" | Invoke-Expression`

  return (
      <div className="main">
        <div className={styles.contentContainer}>
          <br />
          <div className={styles.header}>Instalar Spotify Listen Together</div>
          <br /><br />
          <div className={styles.header+" "+styles.left}>Instalação automática no Windows para Spotify Marketplace</div>
          <br />
          <div className={styles.text+" "+styles.left}>
            1. Pressione WIN + R<br/>
            2. Digite &quot;Powershell&quot; e pressione ENTER<br/>
            3. Cole:
          </div>
          <br />
          <div className={spotStyles.box+" "+styles.code} onClick={(e) => {
            navigator.clipboard.writeText(windowsInstallCMD)

            if (window.getSelection) {
              const selection = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(e.currentTarget);
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          }}>
            {windowsInstallCMD}
          </div>
          <br /><br />
          <br /><br />
          <div className={styles.header+" "+styles.left}>OU: Instalação manual</div>
          <br />
          <div className={styles.text+" "+styles.left}>
            1. Baixe e instale <a href="https://spicetify.app/docs/getting-started/installation">Spicetify</a>.<br/><br/>
            2. Baixe <a href={listenTogetherURL}>listenTogether.js</a>.<br/><br/>
            3. Cole &quot;listenTogether.js&quot; em &quot;.../.spicetify/Extensions&quot; (encontre a pasta &quot;.spicetify&quot; digitando &quot;spicetify -c&quot; no Powershell).<br/><br/>
            4. Execute &quot;spicetify config extensions listenTogether.js&quot; e &quot;spicetify backup apply&quot;.<br/><br/>
          </div>
          <br/><br/>
          <br/><br/>
          <div className={styles.header+" "+styles.left}>Após a instalação</div>
          <br/>
          <div className={styles.text+" "+styles.left+" "+styles.instructionsContainer}>
            <div>
              {"1. Abra o menu do Listen Together pressionando o botão no canto superior esquerdo."}<br/>
              <img src="images/Instruction1.png" alt="Instrução 1"></img><br/><br/>
            </div>
            <div>
              {"2. Selecione \"Join a server\""}<br/>
              <img src="images/Instruction2.png" alt="Instrução 2"></img><br/><br/>
            </div>
            <div>
              {"3. Digite a URL e seu nome"}<br/>
              <div className={styles.instruction2Container}>
                <img src="/images/Instruction3.png" alt="Instrução 3"></img>
                <span className={styles.urlValue}>
                {typeof location !== 'undefined' ? location.protocol + '//' + location.host : ""}
              </span>
              </div>
            </div>
          </div>
          <br/><br/><br/><br/><br/><br/><br/><br/>
        </div>
      </div>
  )
}

export default Instructions
