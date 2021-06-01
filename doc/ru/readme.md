[![Github](https://camo.githubusercontent.com/fd006c07433ca616850a376d9ab7aeb0be0ebe145eef595dd7d585a787a71071/687474703a2f2f696d672e736869656c64732e696f2f6e706d2f762f696f62726f6b65722e6b6e782e737667)](https://www.npmjs.com/package/iobroker.knx)
> Адаптер KNX позволяет IoBroker взаимодействовать с шиной KNX. Для работы адаптера необходимо наличие IP шлюза KNX в системе. Обмен данными происходит по протоколу TCP. Таким образом, платформа где установлен IoBroker должна находится в одной сети с IP шлюзом KNX.
=== 0. Установка адаптера.
1. Открыть вкладку "драйвера"
2. в поиске набрать "knx"
3. нажать на ...
4. нажать на **+**
5. нажать "Добавить"
6. Принять лицензионное соглашение
<{В картинках:
0x0:/baza-znanijj/podsistemy-avtomatizacii-/programmnyexabyavtomatizacii/iobroker/adaptery/knx/.files/image.png
0x0:/baza-znanijj/podsistemy-avtomatizacii-/programmnyexabyavtomatizacii/iobroker/adaptery/knx/.files/image-1.png
0x0:/baza-znanijj/podsistemy-avtomatizacii-/programmnyexabyavtomatizacii/iobroker/adaptery/knx/.files/image-2.png
}>

=== 1. Настройка адаптера.
После установки адаптера, вы попадете в его настройки. Так же в настройки адаптера можно попасть через вкладку "Настройки", отфильтровав адаптеры по слову "knx" и нажав на гаечный ключ - 0x0:/baza-znanijj/podsistemy-avtomatizacii-/programmnyexabyavtomatizacii/iobroker/adaptery/knx/.files/image-3.png
<{В картинках:
0x0:/baza-znanijj/podsistemy-avtomatizacii-/programmnyexabyavtomatizacii/iobroker/adaptery/knx/.files/image-4.png
}>
В настройках адаптера необходимо:
1. Указать **Gateway IP** - ip адрес шлюза KNX
2. **Интерфейс локальной сети** - тот интерфейс, который выходит в локальную сеть
3. **Физический EIB адрес** - любой __свободный__ EIB адрес, не заканчивающийся на "0". **1.1.241** - вполне подойдет.
4. нажать кнопку %% KNXPROJ - ФАЙЛ %%
5. Выбрать файл knxproj (проект __НЕ ДОЛЖЕН__ быть запаролен), дождаться добавления объектов из knx проекта
6. Нажать OK
<{В картинках:
0x0:/baza-znanijj/podsistemy-avtomatizacii-/programmnyexabyavtomatizacii/iobroker/adaptery/knx/.files/image-6.png

0x0:/baza-znanijj/podsistemy-avtomatizacii-/programmnyexabyavtomatizacii/iobroker/adaptery/knx/.files/image-5.png
}>
=== 2. Лицензия.
Для работы адаптера требуется приобретение лицензии на адаптер на странице ((https://iobroker.net/accountLicenses iobroker.net)) 
